// ============================================================
//  MyoMap · 动作质量分析（姿态关键点）
//  用浏览器端姿态关键点检测替换 ai.html 原有的“随机评分”演示实现
//
//  设计原则（与项目一致）：
//   1. 本地优先：推理依赖（MediaPipe tasks-vision）与模型全部放在 libs/，离线可用；
//   2. 优雅降级：模型或推理不可用时抛出明确错误，页面回退到提示，不影响其他功能；
//   3. 可解释：评分来自可复算的关节角度阈值，而不是随机数。
// ============================================================
window.MyPose = (function () {
  // 由本脚本自身的 URL 反推项目根目录，保证在不同层级的页面中都能正确定位依赖
  const SELF = (document.currentScript && document.currentScript.src) || '';
  const ROOT = SELF ? new URL('../../', SELF).href : new URL('../../', location.href).href;
  const MP_BASE = ROOT + 'libs/mediapipe/';
  const MODEL = MP_BASE + 'pose_landmarker_full.task';
  const WASM = MP_BASE + 'wasm';
  // 关键点索引（MediaPipe Pose 33 点模型）
  const L = {
    nose: 0, lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14,
    lWrist: 15, rWrist: 16, lHip: 23, rHip: 24, lKnee: 25, rKnee: 26,
    lAnkle: 27, rAnkle: 28, lHeel: 29, rHeel: 30, lFoot: 31, rFoot: 32
  };

  let landmarker = null;
  let loading = null;

  // ---------- 向量与角度 ----------
  function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) }; }
  function len(v) { return Math.sqrt(v.x * v.x + v.y * v.y + (v.z || 0) * (v.z || 0)); }

  /** 三点夹角（度）：顶点为 b，返回值域 [0,180] */
  function angle(a, b, c) {
    const v1 = sub(a, b), v2 = sub(c, b);
    const d = (v1.x * v2.x + v1.y * v2.y + (v1.z || 0) * (v2.z || 0)) / (len(v1) * len(v2) || 1e-6);
    return Math.acos(Math.max(-1, Math.min(1, d))) * 180 / Math.PI;
  }

  /** 线段与竖直方向的夹角（度） */
  function tiltFromVertical(a, b) {
    const v = sub(a, b);
    const ang = Math.atan2(Math.abs(v.x), Math.abs(v.y)) * 180 / Math.PI;
    return ang;
  }

  function visible(pts, idx, min) {
    return idx.every(i => pts[i] && (pts[i].visibility === undefined || pts[i].visibility >= (min || 0.3)));
  }

  // ---------- 加载模型 ----------
  function load(onProgress) {
    if (landmarker) return Promise.resolve(landmarker);
    if (loading) return loading;
    loading = (async function () {
      onProgress && onProgress('正在加载姿态模型…');
      const vision = await import(MP_BASE + 'vision_bundle.mjs');
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM);
      const make = (delegate) => vision.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL, delegate: delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      try {
        landmarker = await make('GPU');
      } catch (e) {
        onProgress && onProgress('GPU 不可用，切换 CPU 推理…');
        landmarker = await make('CPU');
      }
      onProgress && onProgress('姿态模型就绪');
      return landmarker;
    })();
    loading.catch(() => { loading = null; });
    return loading;
  }

  // ---------- 单帧指标 ----------
  function frameMetrics(pts) {
    const m = {};
    if (visible(pts, [L.lHip, L.lKnee, L.lAnkle])) m.kneeL = angle(pts[L.lHip], pts[L.lKnee], pts[L.lAnkle]);
    if (visible(pts, [L.rHip, L.rKnee, L.rAnkle])) m.kneeR = angle(pts[L.rHip], pts[L.rKnee], pts[L.rAnkle]);
    if (m.kneeL != null && m.kneeR != null) m.knee = (m.kneeL + m.kneeR) / 2;
    else m.knee = m.kneeL != null ? m.kneeL : m.kneeR;

    if (visible(pts, [L.lShoulder, L.lHip, L.lKnee])) m.hipL = angle(pts[L.lShoulder], pts[L.lHip], pts[L.lKnee]);
    if (visible(pts, [L.rShoulder, L.rHip, L.rKnee])) m.hipR = angle(pts[L.rShoulder], pts[L.rHip], pts[L.rKnee]);
    m.hip = m.hipL != null && m.hipR != null ? (m.hipL + m.hipR) / 2 : (m.hipL != null ? m.hipL : m.hipR);

    // 躯干前倾：肩中点与髋中点连线相对竖直方向
    if (visible(pts, [L.lShoulder, L.rShoulder, L.lHip, L.rHip])) {
      const sMid = { x: (pts[L.lShoulder].x + pts[L.rShoulder].x) / 2, y: (pts[L.lShoulder].y + pts[L.rShoulder].y) / 2 };
      const hMid = { x: (pts[L.lHip].x + pts[L.rHip].x) / 2, y: (pts[L.lHip].y + pts[L.rHip].y) / 2 };
      m.torsoLean = tiltFromVertical(sMid, hMid);
    }
    // 膝内扣/外翻：膝与踝的横向偏移（以髋宽归一化）
    if (visible(pts, [L.lHip, L.rHip, L.lKnee, L.rKnee, L.lAnkle, L.rAnkle])) {
      const hipW = Math.abs(pts[L.lHip].x - pts[L.rHip].x) || 1e-6;
      const kneeGap = Math.abs(pts[L.lKnee].x - pts[L.rKnee].x);
      const ankleGap = Math.abs(pts[L.lAnkle].x - pts[L.rAnkle].x) || 1e-6;
      // 正侧面拍摄时左右腿在画面中几乎重叠，此时无法判断膝内扣，不做该项判定
      m.kneeGapRatio = (kneeGap < 0.02 && ankleGap < 0.02)
        ? null
        : kneeGap / Math.max(ankleGap, hipW * 0.5);
      m.sideView = (kneeGap < 0.02 && ankleGap < 0.02);
    }
    // 左右对称性：左右膝角差
    if (m.kneeL != null && m.kneeR != null) m.kneeAsym = Math.abs(m.kneeL - m.kneeR);
    // 肘角（上肢推/拉）
    if (visible(pts, [L.lShoulder, L.lElbow, L.lWrist])) m.elbowL = angle(pts[L.lShoulder], pts[L.lElbow], pts[L.lWrist]);
    if (visible(pts, [L.rShoulder, L.rElbow, L.rWrist])) m.elbowR = angle(pts[L.rShoulder], pts[L.rElbow], pts[L.rWrist]);
    if (m.elbowL != null && m.elbowR != null) m.elbowAsym = Math.abs(m.elbowL - m.elbowR);
    return m;
  }

  // 上肢动作以肘角为核心指标，其余以下肢膝角为核心指标
  const UPPER_RE = /卧推|推举|俯卧撑|臂屈伸|引体|下拉|划船|弯举/;
  function isUpper(exercise) { return UPPER_RE.test(exercise || ''); }

  // ---------- 动作规则（阈值来自常用力量训练教学口径） ----------
  const RULES = {
    '深蹲': function (rep, all) {
      const issues = [];
      if (rep.minKnee != null) {
        if (rep.minKnee > 115) issues.push({ key: 'depth', level: 'warn', text: '下蹲幅度不足：最低点膝角约 ' + rep.minKnee.toFixed(0) + '°，建议蹲至大腿接近与地面平行（膝角 90°~100°）' });
        else if (rep.minKnee < 55) issues.push({ key: 'depth', level: 'warn', text: '下蹲过深：最低点膝角约 ' + rep.minKnee.toFixed(0) + '°，超过踝关节活动度时腰椎代偿风险增大' });
      }
      if (rep.maxLean != null && rep.maxLean > 45) issues.push({ key: 'lean', level: 'warn', text: '躯干前倾偏大：最大前倾 ' + rep.maxLean.toFixed(0) + '°，建议保持挺胸、核心收紧，控制在 35° 以内' });
      if (rep.maxAsym != null && rep.maxAsym > 12) issues.push({ key: 'asym', level: 'warn', text: '左右不对称：两侧膝角最大差 ' + rep.maxAsym.toFixed(0) + '°，注意重心居中与髋部发力均衡' });
      if (rep.kneeGapRatio != null && rep.kneeGapRatio < 0.72) issues.push({ key: 'valgus', level: 'warn', text: '疑似膝内扣：双膝间距相对踝距偏小（比值 ' + rep.kneeGapRatio.toFixed(2) + '），建议“膝对脚尖”并加强臀中肌' });
      if (rep.range == null || rep.range < 35) issues.push({ key: 'range', level: 'info', text: '动作行程偏小：膝角变化约 ' + (rep.range == null ? 0 : rep.range.toFixed(0)) + '°，请完整完成下蹲与站起' });
      return issues;
    },
    '硬拉': function (rep) {
      const issues = [];
      if (rep.minKnee != null && rep.minKnee < 100) issues.push({ key: 'knee', level: 'warn', text: '屈膝过多：最低点膝角约 ' + rep.minKnee.toFixed(0) + '°，硬拉应以髋铰链为主（膝角多在 110°~140°）' });
      if (rep.maxLean != null && rep.maxLean > 60) issues.push({ key: 'lean', level: 'warn', text: '躯干前倾过大：最大 ' + rep.maxLean.toFixed(0) + '°，提示起始位过高或背阔肌未收紧' });
      if (rep.maxAsym != null && rep.maxAsym > 12) issues.push({ key: 'asym', level: 'warn', text: '左右发力不对称：两侧膝角差 ' + rep.maxAsym.toFixed(0) + '°，检查握距与杠铃轨迹' });
      if (rep.range == null || rep.range < 25) issues.push({ key: 'range', level: 'info', text: '髋伸幅度偏小：髋角变化约 ' + (rep.range == null ? 0 : rep.range.toFixed(0)) + '°，注意锁定髋部' });
      return issues;
    },
    '卧推': function (rep) {
      const issues = [];
      if (rep.minElbow != null && rep.minElbow > 100) issues.push({ key: 'depth', level: 'warn', text: '下放不足：肘角最小约 ' + rep.minElbow.toFixed(0) + '°，建议杠铃触胸前后（肘角 60°~90°）' });
      if (rep.maxAsym != null && rep.maxAsym > 10) issues.push({ key: 'asym', level: 'warn', text: '两侧肘角不一致（最大差 ' + rep.maxAsym.toFixed(0) + '°），注意双手同步推起' });
      if (rep.range == null || rep.range < 30) issues.push({ key: 'range', level: 'info', text: '推起行程偏小：肘角变化约 ' + (rep.range == null ? 0 : rep.range.toFixed(0)) + '°' });
      return issues;
    },
    '推举': function (rep) {
      const issues = [];
      if (rep.maxLean != null && rep.maxLean > 25) issues.push({ key: 'lean', level: 'warn', text: '躯干后仰偏大：最大 ' + rep.maxLean.toFixed(0) + '°，建议收紧臀腹、避免腰椎过伸' });
      if (rep.maxElbow != null && rep.maxElbow < 150) issues.push({ key: 'lockout', level: 'info', text: '顶部未完全伸展：肘角最大约 ' + rep.maxElbow.toFixed(0) + '°，注意推至手臂接近伸直' });
      if (rep.range == null || rep.range < 35) issues.push({ key: 'range', level: 'info', text: '推举行程偏小：肘角变化约 ' + (rep.range == null ? 0 : rep.range.toFixed(0)) + '°' });
      return issues;
    },
    '箭步蹲': function (rep) {
      const issues = [];
      if (rep.minKnee != null && rep.minKnee > 120) issues.push({ key: 'depth', level: 'warn', text: '下蹲幅度不足：最低点膝角约 ' + rep.minKnee.toFixed(0) + '°，建议前腿蹲至大腿接近水平（膝角 90°~110°）' });
      if (rep.maxLean != null && rep.maxLean > 40) issues.push({ key: 'lean', level: 'warn', text: '躯干前倾偏大：最大 ' + rep.maxLean.toFixed(0) + '°，保持上身直立、重心落在前脚中部' });
      if (rep.maxAsym != null && rep.maxAsym > 15) issues.push({ key: 'asym', level: 'warn', text: '左右腿不对称：两侧膝角最大差 ' + rep.maxAsym.toFixed(0) + '°，注意两侧均衡下蹲' });
      if (rep.range == null || rep.range < 35) issues.push({ key: 'range', level: 'info', text: '动作行程偏小：膝角变化约 ' + (rep.range == null ? 0 : rep.range.toFixed(0)) + '°' });
      return issues;
    },
    '保加利亚分腿蹲': function (rep) {
      const issues = [];
      if (rep.minKnee != null && rep.minKnee > 115) issues.push({ key: 'depth', level: 'warn', text: '下蹲幅度不足：最低点膝角约 ' + rep.minKnee.toFixed(0) + '°，建议蹲至后膝接近地面（前腿膝角 90°~110°）' });
      if (rep.maxLean != null && rep.maxLean > 40) issues.push({ key: 'lean', level: 'warn', text: '躯干前倾偏大：最大 ' + rep.maxLean.toFixed(0) + '°，注意保持骨盆稳定' });
      if (rep.range == null || rep.range < 35) issues.push({ key: 'range', level: 'info', text: '动作行程偏小：膝角变化约 ' + (rep.range == null ? 0 : rep.range.toFixed(0)) + '°' });
      return issues;
    },
    '腿举': function (rep) {
      const issues = [];
      if (rep.minKnee != null && rep.minKnee > 100) issues.push({ key: 'depth', level: 'warn', text: '下放不足：最低点膝角约 ' + rep.minKnee.toFixed(0) + '°，建议下放至膝角约 90°' });
      else if (rep.minKnee != null && rep.minKnee < 50) issues.push({ key: 'depth', level: 'warn', text: '下放过深：最低点膝角约 ' + rep.minKnee.toFixed(0) + '°，避免臀部离垫、腰椎卷曲' });
      if (rep.range == null || rep.range < 40) issues.push({ key: 'range', level: 'info', text: '动作行程偏小：膝角变化约 ' + (rep.range == null ? 0 : rep.range.toFixed(0)) + '°' });
      return issues;
    },
    '臀推': function (rep) {
      const issues = [];
      if (rep.range == null || rep.range < 20) issues.push({ key: 'range', level: 'info', text: '髋伸幅度偏小：顶髋行程不足，注意顶部收紧臀部' });
      if (rep.maxLean != null && rep.maxLean > 40) issues.push({ key: 'lean', level: 'warn', text: '躯干角度变化偏大：最大 ' + rep.maxLean.toFixed(0) + '°，保持下巴微收、肋骨下沉' });
      return issues;
    },
    '俯卧撑': function (rep) {
      const issues = [];
      if (rep.minElbow != null && rep.minElbow > 110) issues.push({ key: 'depth', level: 'warn', text: '下放不足：肘角最小约 ' + rep.minElbow.toFixed(0) + '°，建议胸部接近地面（肘角约 90°）' });
      if (rep.maxLean != null && rep.maxLean > 45) issues.push({ key: 'lean', level: 'warn', text: '躯干角度偏大：身体应保持一条直线，避免塌腰或撅臀' });
      if (rep.range == null || rep.range < 30) issues.push({ key: 'range', level: 'info', text: '推起行程偏小：肘角变化约 ' + (rep.range == null ? 0 : rep.range.toFixed(0)) + '°' });
      return issues;
    },
    '臂屈伸': function (rep) {
      const issues = [];
      if (rep.minElbow != null && rep.minElbow > 100) issues.push({ key: 'depth', level: 'warn', text: '下放不足：肘角最小约 ' + rep.minElbow.toFixed(0) + '°，建议下放至肘角约 90°' });
      if (rep.range == null || rep.range < 30) issues.push({ key: 'range', level: 'info', text: '动作行程偏小：肘角变化约 ' + (rep.range == null ? 0 : rep.range.toFixed(0)) + '°' });
      return issues;
    },
    '引体向上': function (rep) {
      const issues = [];
      if (rep.maxElbow != null && rep.maxElbow < 60) issues.push({ key: 'contraction', level: 'info', text: '顶部收缩不足：肘角最小约 ' + rep.maxElbow.toFixed(0) + '°，尽量将下巴拉过横杠' });
      if (rep.maxAsym != null && rep.maxAsym > 12) issues.push({ key: 'asym', level: 'warn', text: '两侧肘角不一致（最大差 ' + rep.maxAsym.toFixed(0) + '°），注意均匀发力' });
      if (rep.range == null || rep.range < 40) issues.push({ key: 'range', level: 'info', text: '动作行程偏小：肘角变化约 ' + (rep.range == null ? 0 : rep.range.toFixed(0)) + '°' });
      return issues;
    },
    '高位下拉': function (rep) {
      const issues = [];
      if (rep.maxElbow != null && rep.maxElbow < 60) issues.push({ key: 'contraction', level: 'info', text: '底部收缩不足：肘角最小约 ' + rep.maxElbow.toFixed(0) + '°，下拉时肘部尽量贴近身体' });
      if (rep.range == null || rep.range < 35) issues.push({ key: 'range', level: 'info', text: '动作行程偏小：肘角变化约 ' + (rep.range == null ? 0 : rep.range.toFixed(0)) + '°' });
      return issues;
    },
    '划船': function (rep) {
      const issues = [];
      if (rep.maxElbow != null && rep.maxElbow < 60) issues.push({ key: 'contraction', level: 'info', text: '收缩不足：肘角最小约 ' + rep.maxElbow.toFixed(0) + '°，拉动时肘部向后、肩胛后收' });
      if (rep.range == null || rep.range < 35) issues.push({ key: 'range', level: 'info', text: '动作行程偏小：肘角变化约 ' + (rep.range == null ? 0 : rep.range.toFixed(0)) + '°' });
      return issues;
    },
    '弯举': function (rep) {
      const issues = [];
      if (rep.maxElbow != null && rep.maxElbow < 40) issues.push({ key: 'contraction', level: 'info', text: '顶部收缩不足：肘角最小约 ' + rep.maxElbow.toFixed(0) + '°，尽量屈肘至前臂贴近上臂' });
      if (rep.maxLean != null && rep.maxLean > 25) issues.push({ key: 'lean', level: 'warn', text: '躯干晃动偏大：最大 ' + rep.maxLean.toFixed(0) + '°，避免借力甩起' });
      if (rep.range == null || rep.range < 40) issues.push({ key: 'range', level: 'info', text: '动作行程偏小：肘角变化约 ' + (rep.range == null ? 0 : rep.range.toFixed(0)) + '°' });
      return issues;
    }
  };

  /** 从逐帧指标中提取一次动作的关键特征 */
  function summarize(series, exercise) {
    const val = (k) => series.map(s => s.metrics[k]).filter(v => v != null && !isNaN(v));
    const knee = val('knee'), lean = val('torsoLean'), elbow = val('elbowL');
    const gap = val('kneeGapRatio');
    const upper = isUpper(exercise);
    let asym = upper ? val('elbowAsym') : val('kneeAsym');
    if (!asym.length) asym = upper ? val('kneeAsym') : val('elbowAsym');
    const rep = {
      frames: series.length,
      upper: upper,
      minKnee: knee.length ? Math.min.apply(null, knee) : null,
      maxKnee: knee.length ? Math.max.apply(null, knee) : null,
      maxLean: lean.length ? Math.max.apply(null, lean) : null,
      maxAsym: asym.length ? Math.max.apply(null, asym) : null,
      minElbow: elbow.length ? Math.min.apply(null, elbow) : null,
      maxElbow: elbow.length ? Math.max.apply(null, elbow) : null,
      kneeGapRatio: gap.length ? Math.min.apply(null, gap) : null
    };
    const rangeSource = upper ? elbow : knee;
    rep.range = rangeSource.length ? Math.max.apply(null, rangeSource) - Math.min.apply(null, rangeSource) : null;
    rep.issues = (RULES[exercise] || RULES['深蹲'])(rep, series);
    // 评分：每类问题按严重度扣分，最低 55 分，保证结果可复算
    let score = 100;
    rep.issues.forEach(i => { score -= i.level === 'warn' ? 9 : 4; });
    rep.score = Math.max(55, Math.min(100, Math.round(score)));
    rep.level = rep.score >= 88 ? 'good' : rep.score >= 74 ? 'ok' : 'poor';
    return rep;
  }

  /**
   * 分析动作视频
   * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} source
   * @param {Object} opts { exercise, sampleFps, onProgress, onFrame }
   * @returns {Promise<{summary:Object, series:Array}>}
   */
  async function analyze(source, opts) {
    opts = opts || {};
    const exercise = opts.exercise || '深蹲';
    const sampleFps = opts.sampleFps || 8;
    const lm = await load(opts.onProgress);

    const isVideo = source.tagName === 'VIDEO';
    const duration = isVideo && isFinite(source.duration) && source.duration > 0 ? source.duration : 1;
    // 动图（GIF / 动画 WebP）在浏览器中以 <img> 形式提供，若其暴露 frames 属性则逐帧分析
    const animated = !isVideo && source.frames && source.frames.length > 1;
    const total = isVideo ? Math.max(1, Math.floor(duration * sampleFps))
                          : (animated ? source.frames.length : 1);
    const canvas = document.createElement('canvas');
    const series = [];
    let lastTs = -1;

    for (let i = 0; i < total; i++) {
      const t = isVideo ? (i / sampleFps) : (animated ? i : 0);
      if (isVideo) {
        if (t >= duration) break;
        await seek(source, t);
      }
      const f0 = animated ? source.frames[i] : source;
      canvas.width = f0.videoWidth || f0.naturalWidth || f0.width;
      canvas.height = f0.videoHeight || f0.naturalHeight || f0.height;
      if (!canvas.width || !canvas.height) continue;
      const frameSource = animated ? source.frames[i] : source;
      canvas.getContext('2d').drawImage(frameSource, 0, 0, canvas.width, canvas.height);

      let ts = t * 1000;
      if (ts <= lastTs) ts = lastTs + 1;
      lastTs = ts;
      let res;
      try {
        res = lm.detectForVideo(canvas, ts);
      } catch (e) {
        res = lm.detect(canvas);
      }
      const pts = res && res.landmarks && res.landmarks[0];
      if (!pts) continue;
      const metrics = frameMetrics(pts);
      series.push({ t: t, landmarks: pts, metrics: metrics });
      opts.onFrame && opts.onFrame(series.length / total, pts, metrics);
      if (opts.onProgress && i % 4 === 0) {
        opts.onProgress('正在分析第 ' + (i + 1) + ' / ' + total + ' 帧…');
      }
    }

    if (!series.length) {
      const err = new Error('未能从视频中检测到人体关键点');
      err.code = 'NO_POSE';
      throw err;
    }
    return { summary: summarize(series, exercise), series: series };
  }

  /** 将视频定位到指定时间并等待可绘制 */
  function seek(video, t) {
    return new Promise(function (resolve) {
      const done = () => { video.removeEventListener('seeked', done); resolve(); };
      if (Math.abs(video.currentTime - t) < 1e-3) return resolve();
      video.addEventListener('seeked', done);
      try { video.currentTime = t; } catch (e) { resolve(); }
      setTimeout(done, 900);
    });
  }

  /** 在 canvas 上绘制骨架与关节角，用于结果回显 */
  function drawSkeleton(canvas, landmarks, metrics) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const EDGES = [[11, 12], [11, 23], [12, 24], [23, 24], [11, 13], [13, 15], [12, 14], [14, 16],
      [23, 25], [25, 27], [27, 29], [29, 31], [24, 26], [26, 28], [28, 30], [30, 32]];
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,107,53,0.95)';
    EDGES.forEach(function (e) {
      const a = landmarks[e[0]], b = landmarks[e[1]];
      if (!a || !b) return;
      ctx.beginPath();
      ctx.moveTo(a.x * W, a.y * H);
      ctx.lineTo(b.x * W, b.y * H);
      ctx.stroke();
    });
    ctx.fillStyle = '#2ecc71';
    landmarks.forEach(function (p) {
      if (p.visibility !== undefined && p.visibility < 0.3) return;
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    if (metrics && metrics.knee != null) {
      const k = landmarks[L.lKnee] || landmarks[L.rKnee];
      if (k) {
        ctx.fillStyle = '#ffc93c';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('膝 ' + metrics.knee.toFixed(0) + '°', k.x * W + 10, k.y * H);
      }
    }
  }

  function isReady() { return !!landmarker; }

  /** 仅供自动化验证使用：注入一个替代检测器，避免在无 GPU 环境下加载真实模型 */
  function __setLandmarkerForTest(fake) {
    landmarker = fake;
    loading = Promise.resolve(fake);
  }

  return { load, analyze, drawSkeleton, angle, frameMetrics, isReady, LM: L,
           __setLandmarkerForTest: __setLandmarkerForTest };
})();
