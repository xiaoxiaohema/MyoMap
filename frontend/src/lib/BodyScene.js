// ============================================================
//  3D 肌肉模型查看器 — 基于 Z-Anatomy / body.glb（性能优化版）
//  使用 Three.js + DRACO 加载，支持分块点击与肌肉联动
//  优化要点：共享材质、按需渲染、降低阴影开销、灯光精简
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

let scene, camera, renderer, controls;
let raycaster, mouse;
let clickableObjects = [];
let hoveredObject = null;
let selected3DObject = null;
let multiSelected = [];   // 外部（首页）多选高亮的对象集合
let modelGroup = null;
let autoRotateTimer = null;

// ---- 按需渲染相关 ----
let needsRender = true;        // 是否需要渲染下一帧
let renderRequested = false;   // 防止重复 requestAnimationFrame

// ---- 共享材质（大幅减少 draw calls）----
let sharedMuscleMat = null;
let sharedBoneMat = null;
let sharedShellMat = null; // 头/手/脚的皮肤外壳材质

// ====== 日常化肤色风格 ======
// 肌肉和骨骼都调成肤色系，整体看起来像正常人而非解剖图
const SKIN_COLOR     = new THREE.Color(0xa8a096); // 肌肉灰色皮肤（稍深，显肌肉分区）
const SKIN_DARK      = new THREE.Color(0xcaa07a); // 骨骼/阴影区（暖棕，融入肤色）
const MUSCLE_HOVER   = new THREE.Color(0xffc090); // 悬停：更亮的肤色
const MUSCLE_SELECT  = new THREE.Color(0xffe0a0); // 选中：柔和金黄
const BONE_COLOR     = new THREE.Color(0xa8a096); // 骨骼与肌肉同色，不显露骨
const SHELL_COLOR    = new THREE.Color(0xc0b09c); // 皮肤外壳色（头/手/脚，暖肤色）
const EMISSIVE_HOVER = new THREE.Color(0x995533); // 悬停柔光（降低强度）
const EMISSIVE_SEL   = new THREE.Color(0xaa6633); // 选中柔光（降低强度）

// 头部是否使用南瓜造型（改为 false 可恢复平滑头型）
const PUMPKIN_HEAD = true;
// 手 → 橘子；脚 → 哈密瓜（改为 false 恢复平滑外壳）
const ORANGE_HANDS = true;
const MELON_FEET   = true;

// ====== 英文→中文肌肉名映射 ======
function mapMuscleName(engName) {
    if (!engName) return null;
    const n = engName.toLowerCase();

    // 胸肌
    if (n.includes('pectoral') || n.includes('subclavius')) return '胸大肌';
    // 背阔肌
    if (n.includes('latissimus')) return '背阔肌';
    // 腘绳肌
    if (n.includes('biceps femoris') || n.includes('semitendinosus') ||
        n.includes('semimembranosus') || n.includes('hamstring') ||
        n.includes('popliteus')) return '腘绳肌';
    // 肱二头肌
    if (n.includes('biceps') || n.includes('coracobrachialis') ||
        n.includes('brachialis')) return '肱二头肌';
    // 肱三头肌
    if (n.includes('triceps') || n.includes('anconeus')) return '肱三头肌';
    // 肩部
    if (n.includes('deltoid')) return '肩前束';
    if (n.includes('infraspinatus') || n.includes('teres') ||
        n.includes('supraspinatus') || n.includes('subscapularis')) return '肩后束';
    // 腹部
    if (n.includes('rectus abdominis') || n.includes('linea alba') ||
        n.includes('pyramidalis')) return '腹直肌';
    if (n.includes('obliqu') || n.includes('transverse abdominal')) return '腹外斜肌';
    // 股四头肌
    if (n.includes('quadriceps') || n.includes('rectus femoris') ||
        n.includes('vastus') || n.includes('sartorius') ||
        n.includes('pectineus') || n.includes('gracilis') ||
        n.includes('adductor')) return '股四头肌';
    // 臀肌
    if (n.includes('glute') || n.includes('piriformis') ||
        n.includes('gemelli') || n.includes('quadratus femoris') ||
        n.includes('obturator')) return '臀大肌';
    // 小腿肌群
    if (n.includes('gastrocnemius') || n.includes('soleus') ||
        n.includes('tibialis') || n.includes('peroneus') ||
        n.includes('fibularis') || n.includes('plantaris') ||
        n.includes('flexor digitorum longus') ||
        n.includes('flexor hallucis longus') ||
        n.includes('extensor digitorum longus') ||
        n.includes('extensor hallucis longus')) return '小腿肌群';
    // 斜方肌
    if (n.includes('trapezius')) return '斜方肌';
    // 中背部
    if (n.includes('rhomboid') || n.includes('levator scapulae') ||
        n.includes('serratus anterior')) return '中背部';
    // 下背部
    if (n.includes('erector') || n.includes('spinae') ||
        n.includes('iliocostalis') || n.includes('longissimus') ||
        n.includes('spinalis') || n.includes('multifidus') ||
        n.includes('rotatores') || n.includes('interspinales') ||
        n.includes('semispinalis') || n.includes('splenius') ||
        n.includes('quadratus lumborum') ||
        n.includes('psoas') || n.includes('iliacus')) return '下背部';
    // 前臂肌群
    if (n.includes('brachioradialis') || n.includes('flexor carpi') ||
        n.includes('extensor carpi') || n.includes('palmaris') ||
        n.includes('pronator') || n.includes('supinator') ||
        n.includes('extensor digitorum') || n.includes('extensor digiti minimi') ||
        n.includes('flexor digitorum') || n.includes('extensor pollicis') ||
        n.includes('flexor pollicis') || n.includes('abductor pollicis') ||
        n.includes('opponens pollicis') || n.includes('adductor pollicis') ||
        n.includes('abductor digiti minimi') || n.includes('opponens digiti minimi') ||
        n.includes('flexor digiti minimi') || n.includes('lumbrical') ||
        n.includes('interossei') || n.includes('extensor indicis')) return '前臂肌群';
    // 头/颈部
    if (n.includes('frontalis') || n.includes('occipitalis') ||
        n.includes('temporal') || n.includes('masseter') ||
        n.includes('orbicularis') || n.includes('buccinator') ||
        n.includes('zygomaticus') || n.includes('risorius') ||
        n.includes('mentalis') || n.includes('nasalis') ||
        n.includes('procerus') || n.includes('corrugator') ||
        n.includes('depressor') || n.includes('levator anguli') ||
        n.includes('levator labii') || n.includes('platysma') ||
        n.includes('epicranial') || n.includes('temporoparietalis') ||
        n.includes('digastric') || n.includes('stylohyoid') ||
        n.includes('geniohyoid') || n.includes('mylohyoid') ||
        n.includes('sternohyoid') || n.includes('sternothyroid') ||
        n.includes('thyrohyoid') || n.includes('omohyoid') ||
        n.includes('sternocleidomastoid') || n.includes('scalene') ||
        n.includes('longus capitis') || n.includes('longus colli') ||
        n.includes('genioglossus') || n.includes('hyoglossus') ||
        n.includes('stylopharyngeus') || n.includes('palatopharyngeus') ||
        n.includes('pharyngeal constrictor') || n.includes('crico-arytenoid') ||
        n.includes('arytenoid') || n.includes('cricothyroid') ||
        n.includes('thyro-arytenoid') || n.includes('intertransversarii')) return '头';
    // 肋间肌、膈肌归入胸大肌
    if (n.includes('intercostal') || n.includes('diaphragm') ||
        n.includes('transversus thoracis') || n.includes('serratus posterior')) return '胸大肌';

    return null;
}

// ====== 判断是否为头/手/脚部位（只显示皮肤外壳）======
function isShellPart(engName) {
    if (!engName) return false;
    const n = engName.toLowerCase();

    // === 头部：面肌、咀嚼肌、颈肌、颅骨、面骨、舌骨、喉软骨等 ===
    if (n.includes('frontalis') || n.includes('occipitalis') ||
        n.includes('temporal') || n.includes('masseter') ||
        n.includes('orbicularis') || n.includes('buccinator') ||
        n.includes('zygomaticus') || n.includes('risorius') ||
        n.includes('mentalis') || n.includes('nasalis') ||
        n.includes('procerus') || n.includes('corrugator') ||
        n.includes('depressor') || n.includes('levator anguli') ||
        n.includes('levator labii') || n.includes('platysma') ||
        n.includes('epicranial') || n.includes('temporoparietalis') ||
        n.includes('digastric') || n.includes('stylohyoid') ||
        n.includes('geniohyoid') || n.includes('mylohyoid') ||
        n.includes('sternohyoid') || n.includes('sternothyroid') ||
        n.includes('thyrohyoid') || n.includes('omohyoid') ||
        n.includes('sternocleidomastoid') || n.includes('scalene') ||
        n.includes('longus capitis') || n.includes('longus colli') ||
        n.includes('genioglossus') || n.includes('hyoglossus') ||
        n.includes('stylopharyngeus') || n.includes('palatopharyngeus') ||
        n.includes('pharyngeal constrictor') || n.includes('crico-arytenoid') ||
        n.includes('arytenoid') || n.includes('cricothyroid') ||
        n.includes('thyro-arytenoid') || n.includes('thyro-epiglottic') ||
        n.includes('oblique arytenoid') || n.includes('transverse arytenoid') ||
        n.includes('posterior crico') || n.includes('lateral crico') ||
        n.includes('vocal') || n.includes('epiglott') ||
        // 头部骨骼
        n.includes('skull') || n.includes('mandible') || n.includes('maxilla') ||
        n.includes('frontal bone') || n.includes('parietal') || n.includes('temporal bone') ||
        n.includes('occipital bone') || n.includes('sphenoid') || n.includes('ethmoid') ||
        n.includes('zygomatic bone') || n.includes('nasal bone') || n.includes('lacrimal') ||
        n.includes('palatine bone') || n.includes('vomer') || n.includes('inferior nasal') ||
        n.includes('tooth') || n.includes('canine') || n.includes('incisor') || n.includes('molar') ||
        n.includes('hyoid') || n.includes('thyroid cartilage') || n.includes('cricoid') ||
        n.includes('corniculate') || n.includes('arytenoid cartilage') ||
        n.includes('epiglottis') || n.includes('larynx') || n.includes('pharynx') ||
        n.includes('tongue') || n.includes('eyeball') || n.includes('eye') ||
        n.includes('ear') || n.includes('nose') || n.includes('lip') || n.includes('cheek') ||
        n.includes('face') || n.includes('scalp') || n.includes('atlas') ||
        n.includes('axis (anatomy') || n.includes('cervical vertebra')) return true;

    // === 手部：手内在肌、腕骨、掌骨、指骨 ===
    if (n.includes('abductor digiti minimi muscle of hand') ||
        n.includes('flexor digiti minimi brevis muscle (hand') ||
        n.includes('opponens digiti minimi muscle of hand') ||
        n.includes('lumbricals of the hand') ||
        n.includes('dorsal interossei of the hand') ||
        n.includes('palmar interossei muscles') ||
        n.includes('opponens pollicis') || n.includes('adductor pollicis') ||
        n.includes('flexor pollicis brevis') || n.includes('abductor pollicis brevis') ||
        n.includes('palmaris brevis') ||
        // 手部骨骼
        n.includes('capitate bone') || n.includes('hamate') || n.includes('trapezium') ||
        n.includes('trapezoid') || n.includes('scaphoid') || n.includes('lunate') ||
        n.includes('triquetrum') || n.includes('pisiform') || n.includes('metacarpal') ||
        n.includes('phalanx') || n.includes('proximal phalanx') ||
        n.includes('middle phalanx') || n.includes('distal phalanx') ||
        n.includes('carpal') || n.includes('metacarpus') ||
        n.includes('thumb') || n.includes('finger')) return true;

    // === 脚部：足内在肌、跗骨、跖骨、趾骨 ===
    if (n.includes('abductor hallucis') || n.includes('flexor hallucis brevis') ||
        n.includes('adductor hallucis') || n.includes('flexor digitorum brevis') ||
        n.includes('abductor digiti minimi (foot') || n.includes('quadratus plantae') ||
        n.includes('lumbricals of the foot') || n.includes('plantar interossei') ||
        n.includes('dorsal interossei of the foot') || n.includes('extensor digitorum brevis') ||
        n.includes('extensor hallucis brevis') ||
        // 脚部骨骼
        n.includes('calcaneus') || n.includes('talus') || n.includes('navicular') ||
        n.includes('cuboid') || n.includes('cuneiform') || n.includes('metatarsal') ||
        n.includes('tarsal') || n.includes('tarsus') ||
        n.includes('proximal phalanx of foot') || n.includes('toe') ||
        n.includes('hallux') || n.includes('foot')) return true;

    return false;
}

// ====== 判断头/手/脚区域（用于以平滑外壳替换骨骼，避免"露骨"）======
// 返回 'head' | 'hand' | 'foot' | null；不含颈部（颈部保留原样）
function shellRegion(engName) {
    if (!engName) return null;
    const n = engName.toLowerCase();
    const word = (w) => new RegExp('(^|[^a-z])' + w + '([^a-z]|$)').test(n);

    // 眼睑板：名字含 tarsus，但属于头部
    if (n.includes('eyelid') || n.includes('tarsus (eyelid')) return 'head';

    // 指骨/趾骨：网格名同为 "Phalanx"，无法从名字区分，交由位置判定
    if (n.includes('phalanx')) return 'phalanx';

    // ---- 手部（腕骨/掌骨 + 手内在肌）----
    if (n.includes('abductor digiti minimi muscle of hand') ||
        n.includes('flexor digiti minimi brevis muscle (hand') ||
        n.includes('opponens digiti minimi muscle of hand') ||
        n.includes('lumbricals of the hand') ||
        n.includes('dorsal interossei of the hand') ||
        n.includes('palmar interossei muscles') ||
        n.includes('opponens pollicis') || n.includes('adductor pollicis') ||
        n.includes('flexor pollicis brevis') || n.includes('abductor pollicis brevis') ||
        n.includes('palmaris brevis') ||
        n.includes('capitate bone') || n.includes('hamate') || n.includes('trapezium') ||
        n.includes('trapezoid') || n.includes('scaphoid') || n.includes('lunate') ||
        n.includes('triquetrum') || n.includes('pisiform') || n.includes('metacarpal') ||
        n.includes('carpal') || n.includes('metacarpus') ||
        word('thumb') || word('finger')) return 'hand';

    // ---- 脚部（跗骨/跖骨 + 足内在肌）----
    if (n.includes('abductor hallucis') || n.includes('flexor hallucis brevis') ||
        n.includes('adductor hallucis') || n.includes('flexor digitorum brevis') ||
        n.includes('abductor digiti minimi (foot') || n.includes('quadratus plantae') ||
        n.includes('lumbricals of the foot') || n.includes('plantar interossei') ||
        n.includes('dorsal interossei of the foot') || n.includes('extensor digitorum brevis') ||
        n.includes('extensor hallucis brevis') ||
        n.includes('calcaneus') || n.includes('talus') || n.includes('navicular') ||
        n.includes('cuboid') || n.includes('cuneiform') || n.includes('metatarsal') ||
        n.includes('tarsal') || n.includes('tarsus') ||
        word('toe') || n.includes('hallux') || word('foot')) return 'foot';

    // ---- 头部（颅骨/面骨/面肌/感官/舌），不含颈部与喉部 ----
    if (n.includes('skull') || n.includes('neurocranium') || n.includes('viscerocranium') ||
        word('facial') || n.includes('mandible') || n.includes('maxilla') ||
        n.includes('frontal bone') || n.includes('parietal') || n.includes('temporal bone') ||
        n.includes('occipital bone') || n.includes('sphenoid') || n.includes('ethmoid') ||
        n.includes('zygomatic bone') || n.includes('nasal bone') || n.includes('lacrimal') ||
        n.includes('palatine bone') || n.includes('vomer') || n.includes('inferior nasal') ||
        n.includes('tooth') || word('canine') || n.includes('incisor') || n.includes('molar') ||
        n.includes('frontal') || n.includes('occipitalis') || n.includes('temporalis') ||
        n.includes('masseter') || n.includes('orbicularis') || n.includes('buccinator') ||
        n.includes('zygomaticus') || n.includes('risorius') || n.includes('mentalis') ||
        n.includes('nasalis') || n.includes('procerus') || n.includes('corrugator') ||
        n.includes('depressor') || n.includes('levator anguli') || n.includes('levator labii') ||
        n.includes('epicranial') || n.includes('temporoparietalis') ||
        n.includes('tongue') || n.includes('eyeball') || word('eye') ||
        word('ear') || word('nose') || word('lip') || word('cheek') ||
        word('face') || word('scalp')) return 'head';

    return null;
}

// ====== 喉部/咽部深层结构（避免从颈部透出，正面看像骷髅）======
function isDeepNeck(engName) {
    if (!engName) return false;
    const n = engName.toLowerCase();
    return n.includes('thyroid cartilage') || n.includes('cricoid') ||
        n.includes('corniculate') || n.includes('arytenoid') ||
        n.includes('epiglottis') || n.includes('larynx') || n.includes('pharynx') ||
        n.includes('pharyngeal constrictor') || n.includes('vocal') ||
        n.includes('ary-epiglottic') || n.includes('thyro-epiglottic');
}

// ====== 请求渲染（按需渲染核心）======
function requestRender() {
    needsRender = true;
}

// ====== 初始化 ======
window.initGLBViewer = function () {
    const container = document.getElementById('body-3d-container');
    if (!container) return;

    // 防止重复初始化
    if (container.querySelector('canvas')) return;

    const width  = container.clientWidth;
    const height = container.clientHeight || 600;

    // ---- 场景 ----
    scene = new THREE.Scene();
    scene.background = null;

    // ---- 相机 ----
    camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 5);

    // ---- 渲染器（性能优化）----
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    // 像素比上限从 2 降到 1.5，减少 43% 像素填充
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    // 非写实风格关闭阴影，大幅降低 GPU 开销
    renderer.shadowMap.enabled = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    container.appendChild(renderer.domElement);

    // ---- 控制器 ----
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 15;
    controls.target.set(0, 0, 0);
    controls.maxPolarAngle = Math.PI * 0.92;
    controls.minPolarAngle = Math.PI * 0.08;
    controls.autoRotate = false;  // 禁用自动旋转
    controls.autoRotateSpeed = 0.5;

    // 控制器变化时请求渲染
    controls.addEventListener('change', requestRender);

    // ---- 光照（精简到3盏，减少逐灯计算）----
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    scene.add(new THREE.HemisphereLight(0x99aabb, 0x443322, 0.4));

    const keyLight = new THREE.DirectionalLight(0xfff5e6, 0.9);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffaa66, 0.35);
    rimLight.position.set(0, 3, -6);
    scene.add(rimLight);

    // ---- 射线检测 ----
    raycaster = new THREE.Raycaster();
    // 只检测第一个命中，提升性能
    raycaster.firstHitOnly = true;
    mouse = new THREE.Vector2();

    // ---- 创建共享材质 ----
    sharedMuscleMat = new THREE.MeshStandardMaterial({
        color: SKIN_COLOR,
        roughness: 0.65,
        metalness: 0.02,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
    });
    sharedBoneMat = new THREE.MeshStandardMaterial({
        color: BONE_COLOR,
        roughness: 0.7,
        metalness: 0.0,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
    });
    sharedShellMat = new THREE.MeshStandardMaterial({
        color: SHELL_COLOR,
        roughness: 0.55,
        metalness: 0.02,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
    });

    // ---- 加载模型 ----
    loadModel(container);

    // ---- 事件 ----
    renderer.domElement.addEventListener('mousemove', (e) => onMouseMove(e, container));
    renderer.domElement.addEventListener('click',    (e) => onMouseClick(e, container));
    renderer.domElement.addEventListener('mouseleave', onMouseLeave);
    renderer.domElement.addEventListener('mouseenter', () => {
        // autoRotate 已默认禁用
    });

    // 窗口大小变化
    const resizeObserver = new ResizeObserver(() => onResize(container));
    resizeObserver.observe(container);

    animate();
};

// ====== 加载 GLB 模型 ======
function loadModel(container) {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    const APP_BASE = new URL('./', document.baseURI).href;
    dracoLoader.setDecoderPath(APP_BASE + 'draco/');
    loader.setDRACOLoader(dracoLoader);

    showLoadingText(container, '正在加载3D肌肉模型...');

    loader.load(
        APP_BASE + 'body.glb',
        (gltf) => {
            modelGroup = gltf.scene;

            // 居中 + 缩放
            const box = new THREE.Box3().setFromObject(modelGroup);
            const center = box.getCenter(new THREE.Vector3());
            modelGroup.position.sub(center);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            modelGroup.scale.setScalar(3.0 / maxDim);

            // 重新居中
            const box2 = new THREE.Box3().setFromObject(modelGroup);
            modelGroup.position.sub(box2.getCenter(new THREE.Vector3()));

            // 相机定位 - 正面视角
            const size2 = box2.getSize(new THREE.Vector3());
            const maxDim2 = Math.max(size2.x, size2.y, size2.z);
            const fov = camera.fov * (Math.PI / 180);
            const cameraZ = Math.abs(maxDim2 / 2 / Math.tan(fov / 2)) * 1.6;
            camera.position.set(0, 0.3, cameraZ);
            controls.target.set(0, 0, 0);
            controls.azimuthAngle = Math.PI / 2;
            controls.update();

            // 暴露到全局便于调试
            window.__glbCamera = camera;
            window.__glbControls = controls;
            window.__glbScene = scene;
            window.__glbModel = modelGroup;
            window.__glbRenderer = renderer;

            scene.add(modelGroup);
            modelGroup.updateMatrixWorld(true);

            // 遍历 mesh，应用共享材质
            const shellGroups = { head: [], hand: [], foot: [], phalanx: [] };
            modelGroup.traverse((child) => {
                if (child.isMesh) {
                    const type = (child.userData.type || '').toLowerCase();
                    const name = child.userData.name || child.name || '';

                    // 头/手/脚：收集骨骼网格，稍后用平滑外壳替换（避免"露骨"）
                    const region = shellRegion(name);
                    if (region) {
                        shellGroups[region].push(child);
                        child.userData._isShell = true;
                        child.userData._isBone = false;
                        child.userData._region = region;
                        return;
                    }

                    // 喉部/咽部深层软骨：直接隐藏
                    if (isDeepNeck(name)) { child.visible = false; return; }

                    const isShell = isShellPart(name);
                    const isBone = !isShell && (type.includes('bone') || name.toLowerCase().includes('bone'));

                    // 颈部等 → 皮肤外壳材质；骨骼 → 骨骼材质；其余 → 肌肉材质
                    if (isShell) {
                        child.material = sharedShellMat;
                    } else {
                        child.material = isBone ? sharedBoneMat : sharedMuscleMat;
                    }

                    // 关闭阴影（非写实风格不需要）
                    child.castShadow = false;
                    child.receiveShadow = false;

                    // 标记类型，供高亮时判断
                    child.userData._isShell = isShell;
                    child.userData._isBone = isBone;

                    clickableObjects.push(child);
                }
            });

            // 先清加载提示并渲染首帧，外壳重建延后执行（避免久等白屏）
            clearLoadingText(container);
            requestRender();

            // 通知页面模型就绪（便于重新同步选中高亮）
            window.dispatchEvent(new CustomEvent('glb-ready'));

            // 用平滑外壳替换头/手/脚骨骼（放到下一帧的宏任务，先让模型显示出来）
            requestAnimationFrame(function () {
                setTimeout(function () {
                    buildShells(shellGroups);
                    requestRender();
                    window.dispatchEvent(new CustomEvent('glb-decorated'));
                }, 0);
            });

            console.log(`3D模型加载完成，共 ${clickableObjects.length} 个可交互对象（共享材质优化）`);
        },
        (progress) => {
            if (progress.total > 0) {
                const pct = Math.round(progress.loaded / progress.total * 100);
                showLoadingText(container, `加载中... ${pct}%`);
            }
        },
        (error) => {
            console.error('模型加载失败:', error);
            showLoadingText(container, '模型加载失败，请确保 body.glb 存在');
        }
    );
}

// ====== 用平滑外壳替换头/手/脚骨骼 ======
function buildShells(groups) {
    // 指骨/趾骨同名，按位置判定归属（模型底部 12% 视为脚）
    const modelBox = new THREE.Box3().setFromObject(modelGroup);
    const footY = modelBox.min.y + (modelBox.max.y - modelBox.min.y) * 0.12;
    (groups.phalanx || []).forEach(function (m) {
        const cy = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).y;
        (cy < footY ? groups.foot : groups.hand).push(m);
    });

    const volumes = [];

    // 头部：用南瓜完全包裹头部（万圣节风格）
    // 如需恢复平滑头型，将 PUMPKIN_HEAD 改为 false 即可
    if (groups.head && groups.head.length) {
        const headBox = new THREE.Box3();
        groups.head.forEach(function (m) { headBox.union(new THREE.Box3().setFromObject(m)); });
        const headBottom = headBox.isEmpty() ? 0 : headBox.min.y;
        if (PUMPKIN_HEAD) {
            // 仍构建头部体积，用于隐藏颅内深层结构
            const headPts = collectRegionPoints(groups.head, 6000);
            const built = buildSkinVolume(headPts, { thickness: 0.010, lon: 40, lat: 24, smooth: 3, cap: 6000, yMin: headBottom });
            if (built) volumes.push(built.volume);
            groups.head.forEach(function (m) { m.visible = false; });
            const pumpkin = buildPumpkin(headBox);
            if (pumpkin) scene.add(pumpkin);
        } else {
            addRegionSkin(groups.head, { thickness: 0.010, lon: 40, lat: 24, smooth: 3, cap: 6000, yMin: headBottom }, volumes);
        }
    }
    // 手/脚：按左右两侧分别重建（手→橘子、脚→哈密瓜）
    ['hand', 'foot'].forEach(function (region) {
        const meshes = groups[region];
        if (!meshes || !meshes.length) return;
        const sides = { neg: [], pos: [] };
        meshes.forEach(function (m) {
            const c = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
            (c.x < 0 ? sides.neg : sides.pos).push(m);
        });
        meshes.forEach(function (m) { m.visible = false; });
        const opts = { thickness: 0.006, lon: 36, lat: 22, smooth: 3, cap: 5000 };
        const builder = region === 'hand'
            ? (ORANGE_HANDS ? buildOrange : null)
            : (MELON_FEET ? buildMelon : null);
        [sides.neg, sides.pos].forEach(function (side) {
            if (!side.length) return;
            if (builder) addRegionProduce(side, opts, builder, volumes);
            else addRegionSkin(side, opts, volumes);
        });
    });

    // 隐藏所有落在皮肤体积内的网格（眼球肌、听小骨、鼻软骨、牙齿等），
    // 避免它们从头/手/脚外壳里透出来
    const extra = hideInsideVolumes(volumes);

    console.log('平滑外壳重建：头 ' + (groups.head ? groups.head.length : 0) +
        ' · 手 ' + (groups.hand ? groups.hand.length : 0) +
        ' · 脚 ' + (groups.foot ? groups.foot.length : 0) +
        ' 个骨骼网格；额外隐藏壳内结构 ' + extra + ' 个');
}

// ====== 南瓜头：完全包裹头部 ======
function buildPumpkin(box) {
    if (box.isEmpty()) return null;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // 南瓜尺寸略大于头部，确保完全包裹（横向更宽，呈南瓜形）
    const rxz = Math.max(size.x, size.z) * 0.5 * 1.30;
    const ry = size.y * 0.5 * 1.14;

    const group = new THREE.Group();

    // 瓜身：球体 + 纵向瓜棱
    const geo = new THREE.SphereGeometry(1, 72, 48);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    const LOBES = 10, AMP = 0.085;
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const theta = Math.atan2(v.z, v.x);
        const ridge = 1 + AMP * Math.cos(LOBES * theta);
        pos.setXYZ(i, v.x * ridge, v.y, v.z * ridge);
    }
    geo.computeVertexNormals();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.62, metalness: 0.02 });
    const body = new THREE.Mesh(geo, bodyMat);
    body.position.copy(center);
    body.scale.set(rxz, ry, rxz);
    body.castShadow = false;
    body.receiveShadow = false;
    group.add(body);

    // 瓜蒂
    const stemH = ry * 0.5;
    const stemGeo = new THREE.CylinderGeometry(rxz * 0.07, rxz * 0.15, stemH, 14);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x5a7a2e, roughness: 0.85 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(center.x, center.y + ry + stemH * 0.38, center.z);
    stem.rotation.z = 0.16;
    stem.castShadow = false;
    stem.receiveShadow = false;
    group.add(stem);

    group.userData._isShell = true;
    group.userData._isProxy = true;
    return group;
}

// ====== 橘子（手）======
function buildOrange(box) {
    if (box.isEmpty()) return null;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    // 球体（不随 bbox 拉长），半径取最大边并略放大以完全包住手
    const r = Math.max(size.x, size.y, size.z) * 0.5 * 1.12;

    const geo = new THREE.SphereGeometry(1, 56, 40);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        // 细密凹凸（橘皮）
        const d = 1 + 0.03 * (Math.sin(17 * v.x) * Math.cos(15 * v.y) + Math.sin(15 * v.z) * Math.cos(17 * v.x));
        pos.setXYZ(i, v.x * d, v.y * d, v.z * d);
    }
    geo.computeVertexNormals();

    const group = new THREE.Group();
    const body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xff8c1a, roughness: 0.82, metalness: 0.02 }));
    body.position.copy(center);
    body.scale.setScalar(r);
    body.castShadow = false; body.receiveShadow = false;
    group.add(body);

    // 顶部小蒂
    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.05, r * 0.09, r * 0.2, 10),
        new THREE.MeshStandardMaterial({ color: 0x5f7d2e, roughness: 0.9 })
    );
    stem.position.set(center.x, center.y + r, center.z);
    stem.castShadow = false; stem.receiveShadow = false;
    group.add(stem);

    group.userData._isShell = true;
    group.userData._isProxy = true;
    return group;
}

// ====== 哈密瓜（脚）======
function buildMelon(box) {
    if (box.isEmpty()) return null;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const rx = size.x * 0.5 * 1.14;
    const ry = size.y * 0.5 * 1.14;
    const rz = size.z * 0.5 * 1.14;

    const geo = new THREE.SphereGeometry(1, 64, 44);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    const LOBES = 14, AMP = 0.045;
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const theta = Math.atan2(v.z, v.x);
        // 纵向瓜棱 + 轻微网纹起伏
        const ridge = 1 + AMP * Math.cos(LOBES * theta) + 0.015 * Math.sin(22 * v.y);
        pos.setXYZ(i, v.x * ridge, v.y * ridge, v.z * ridge);
    }
    geo.computeVertexNormals();

    const group = new THREE.Group();
    const body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xd0d67e, roughness: 0.88, metalness: 0.02 }));
    body.position.copy(center);
    body.scale.set(rx, ry, rz);
    body.castShadow = false; body.receiveShadow = false;
    group.add(body);

    // 瓜蒂
    const stemH = Math.max(0.02, ry * 0.5);
    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(rx * 0.05, rx * 0.1, stemH, 10),
        new THREE.MeshStandardMaterial({ color: 0x6b7a2e, roughness: 0.9 })
    );
    stem.position.set(center.x, center.y + ry * 0.95, center.z);
    stem.rotation.z = 0.2;
    stem.castShadow = false; stem.receiveShadow = false;
    group.add(stem);

    group.userData._isShell = true;
    group.userData._isProxy = true;
    return group;
}

// 生成一个区域外壳体积（用于隐藏壳内结构），并显示为指定造型（橘子/哈密瓜）
function addRegionProduce(meshes, opts, builder, volumes) {
    const pts = collectRegionPoints(meshes, opts.cap);
    if (pts.length >= 24) {
        const built = buildSkinVolume(pts, opts);
        if (built) volumes.push(built.volume);
    }
    meshes.forEach(function (m) { m.visible = false; });
    const box = new THREE.Box3();
    meshes.forEach(function (m) { box.union(new THREE.Box3().setFromObject(m)); });
    const mesh = builder(box);
    if (mesh) scene.add(mesh);
    return mesh;
}

// 生成一个区域的外壳并登记其体积（用于后续隐藏壳内结构）
function addRegionSkin(meshes, opts, volumes) {
    const pts = collectRegionPoints(meshes, opts.cap);
    if (pts.length < 24) { meshes.forEach(function (m) { m.visible = false; }); return null; }
    const built = buildSkinVolume(pts, opts);
    if (!built) { meshes.forEach(function (m) { m.visible = false; }); return null; }
    meshes.forEach(function (m) { m.visible = false; });
    const mesh = new THREE.Mesh(built.geo, sharedShellMat);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData._isShell = true;
    mesh.userData._isProxy = true;
    scene.add(mesh);
    volumes.push(built.volume);
    return mesh;
}

// 判断点是否在皮肤体积内（按径向支撑函数插值）
function insideVolume(v, x, y, z, margin) {
    const dx = x - v.cx, dy = y - v.cy, dz = z - v.cz;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 1e-6) return true;
    const theta = Math.acos(Math.max(-1, Math.min(1, dy / dist)));
    const phi = Math.atan2(dz, dx);
    let i = Math.round(theta / Math.PI * v.lat);
    let j = Math.round(((phi / (Math.PI * 2)) + 1) % 1 * v.lon);
    if (i < 0) i = 0; if (i > v.lat) i = v.lat;
    if (j < 0) j = 0; if (j > v.lon) j = v.lon;
    return dist <= v.R[i * v.nLon + j] + (margin || 0);
}

function hideInsideVolumes(volumes) {
    if (!volumes.length) return 0;
    const c = new THREE.Vector3();
    let count = 0;
    modelGroup.traverse(function (o) {
        if (!o.isMesh || !o.visible) return;
        const g = o.geometry;
        if (!g) return;
        if (!g.boundingBox) g.computeBoundingBox();
        if (!g.boundingBox) return;
        g.boundingBox.clone().applyMatrix4(o.matrixWorld).getCenter(c);
        for (let k = 0; k < volumes.length; k++) {
            const v = volumes[k];
            if (c.y < v.yMin) continue; // 只隐藏该区域高度以上的结构
            if (insideVolume(v, c.x, c.y, c.z, 0.004)) {
                o.visible = false;
                count++;
                break;
            }
        }
    });
    return count;
}

// ====== 采集区域骨骼的世界坐标顶点（带抽样上限）======
function collectRegionPoints(meshes, cap) {
    let total = 0;
    meshes.forEach(function (m) {
        const pa = m.geometry && m.geometry.attributes && m.geometry.attributes.position;
        if (pa) total += pa.count;
    });
    if (!total) return [];
    const stride = Math.max(1, Math.ceil(total / (cap || 12000)));
    const pts = [];
    const v = new THREE.Vector3();
    let seen = 0;
    meshes.forEach(function (m) {
        const pa = m.geometry && m.geometry.attributes && m.geometry.attributes.position;
        if (!pa) return;
        for (let i = 0; i < pa.count; i++) {
            if ((seen++ % stride) !== 0) continue;
            v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld);
            pts.push(v.x, v.y, v.z);
        }
    });
    return pts;
}

// ====== 由点云重建平滑外壳：支撑函数(凸包) + 球面半径平滑 ======
function buildSkinVolume(points, opts) {
    opts = opts || {};
    const thickness = opts.thickness != null ? opts.thickness : 0.006;
    const lon = opts.lon || 44, lat = opts.lat || 26;
    const smoothPasses = opts.smooth != null ? opts.smooth : 4;
    const n = points.length / 3;
    if (n < 8) return null;

    // 质心
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < n; i++) { cx += points[i * 3]; cy += points[i * 3 + 1]; cz += points[i * 3 + 2]; }
    cx /= n; cy /= n; cz /= n;

    // 相对坐标
    const rel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        rel[i * 3] = points[i * 3] - cx;
        rel[i * 3 + 1] = points[i * 3 + 1] - cy;
        rel[i * 3 + 2] = points[i * 3 + 2] - cz;
    }

    const nLon = lon + 1, nLat = lat + 1;
    const R = new Float32Array(nLon * nLat);

    // 支撑函数：r(d) = max <p-c, d>，即凸包在该方向上的半径
    for (let i = 0; i < nLat; i++) {
        const theta = i / lat * Math.PI, st = Math.sin(theta), ct = Math.cos(theta);
        for (let j = 0; j < nLon; j++) {
            const phi = j / lon * Math.PI * 2;
            const dx = st * Math.cos(phi), dy = ct, dz = st * Math.sin(phi);
            let maxd = 0;
            for (let p = 0; p < n; p++) {
                const d = rel[p * 3] * dx + rel[p * 3 + 1] * dy + rel[p * 3 + 2] * dz;
                if (d > maxd) maxd = d;
            }
            R[i * nLon + j] = maxd;
        }
    }

    // 球面半径平滑（去除凸包棱角，得到有机曲面）
    for (let pass = 0; pass < smoothPasses; pass++) {
        const tmp = R.slice();
        for (let i = 0; i < nLat; i++) {
            for (let j = 0; j < nLon; j++) {
                let s = 0, c = 0;
                for (let di = -1; di <= 1; di++) {
                    const ii = i + di; if (ii < 0 || ii >= nLat) continue;
                    for (let dj = -1; dj <= 1; dj++) {
                        const jj = (j + dj + nLon) % nLon;
                        s += tmp[ii * nLon + jj]; c++;
                    }
                }
                R[i * nLon + j] = s / c;
            }
        }
    }

    // 生成顶点
    const pos = new Float32Array(nLon * nLat * 3);
    for (let i = 0; i < nLat; i++) {
        const theta = i / lat * Math.PI, st = Math.sin(theta), ct = Math.cos(theta);
        for (let j = 0; j < nLon; j++) {
            const phi = j / lon * Math.PI * 2;
            const dx = st * Math.cos(phi), dy = ct, dz = st * Math.sin(phi);
            const r = Math.max(R[i * nLon + j] + thickness, 0.008);
            const k = (i * nLon + j) * 3;
            pos[k] = cx + dx * r; pos[k + 1] = cy + dy * r; pos[k + 2] = cz + dz * r;
        }
    }

    // 三角面
    const idx = [];
    for (let i = 0; i < lat; i++) {
        for (let j = 0; j < lon; j++) {
            const a = i * nLon + j, b = a + nLon, c2 = b + 1, d2 = a + 1;
            idx.push(a, b, d2, b, c2, d2);
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return { geo: geo, volume: { cx: cx, cy: cy, cz: cz, R: R, nLon: nLon, nLat: nLat, lon: lon, lat: lat, yMin: (opts.yMin != null ? opts.yMin : -Infinity) } };
}

// ====== 获取 mesh 的基础共享材质 ======
function getBaseMaterial(obj) {
    if (obj.userData._isShell) return sharedShellMat;
    return obj.userData._isBone ? sharedBoneMat : sharedMuscleMat;
}

// ====== 判断 mesh 是否使用的是共享材质（未被高亮）======
function isUsingSharedMaterial(obj) {
    return obj.material === getBaseMaterial(obj);
}

// ====== 鼠标移动（悬停检测）======
function onMouseMove(event, container) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(clickableObjects, false);

    // 恢复上一个悬停对象
    if (hoveredObject && (!intersects.length || intersects[0].object !== hoveredObject)) {
        if (hoveredObject !== selected3DObject) {
            restoreSharedMaterial(hoveredObject);
        }
        hoveredObject = null;
        document.body.style.cursor = 'default';
        requestRender();
    }

    const tooltip = document.getElementById('muscle-tooltip');

    if (intersects.length > 0) {
        const obj = intersects[0].object;

        if (obj !== selected3DObject && obj !== hoveredObject) {
            highlightHover(obj);
            requestRender();
        }

        hoveredObject = obj;
        if (!obj.userData._isShell) {
            document.body.style.cursor = 'pointer';
            if (tooltip) {
                const cnName = mapMuscleName(obj.userData.name || obj.name);
                tooltip.textContent = cnName || obj.userData.name || obj.name || '';
                tooltip.style.left = event.clientX + 'px';
                tooltip.style.top = (event.clientY - 14) + 'px';
                tooltip.classList.add('visible');
            }
        } else {
            document.body.style.cursor = 'default';
            if (tooltip) tooltip.classList.remove('visible');
        }

    } else {
        if (tooltip) tooltip.classList.remove('visible');
    }
}

// ====== 鼠标点击 ======
function onMouseClick(event, container) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(clickableObjects, false);

    if (intersects.length > 0) {
        handleMuscleClick(intersects[0].object);
        requestRender();
    }
}

// ====== 处理肌肉点击 ======
function handleMuscleClick(obj) {
    const engName = obj.userData.name || obj.name || '';
    const cnName = mapMuscleName(engName);

    // 清除外部批量高亮（避免状态冲突）
    multiSelected.forEach(function (o) { restoreSharedMaterial(o); });
    multiSelected = [];

    // 恢复之前选中的
    if (selected3DObject && selected3DObject !== obj) {
        restoreSharedMaterial(selected3DObject);
    }

    // 点击已选中对象 → 取消选择
    if (selected3DObject === obj) {
        restoreSharedMaterial(obj);
        selected3DObject = null;
    } else {
        highlightSelect(obj);
        selected3DObject = obj;

        // 点击放大：相机聚焦到点击肌肉的几何中心并拉近
        if (!obj.userData._isShell) {
            // 用包围盒中心，避免网格原点在世界坐标原点（脚底）导致聚焦错位
            const box = new THREE.Box3().setFromObject(obj);
            const targetPos = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const radius = Math.max(size.x, size.y, size.z) * 0.5 || 0.4;

            const startPos = camera.position.clone();
            const startTarget = controls.target.clone();
            const endTarget = targetPos.clone();
            // 相机新位置：沿当前视线方向后退，距离随肌肉尺寸自适应
            const dir = startPos.clone().sub(startTarget).normalize();
            const distance = Math.max(1.2, radius * 4.0);
            const endPos = endTarget.clone().add(dir.multiplyScalar(distance));
            const startTime = performance.now();
            const duration = 500;
            function zoomAnim() {
                const t = Math.min((performance.now() - startTime) / duration, 1);
                const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                camera.position.lerpVectors(startPos, endPos, ease);
                controls.target.lerpVectors(startTarget, endTarget, ease);
                controls.update();
                requestRender();
                if (t < 1) requestAnimationFrame(zoomAnim);
            }
            zoomAnim();
        }
    }

    // 无论选中/取消，都通知页面更新选择状态
    if (cnName && typeof window.selectMuscleByName === 'function') {
        window.selectMuscleByName(cnName);
    } else if (!cnName && typeof window.selectMuscle === 'function') {
        window.selectMuscle(engName, null);
    }
    requestRender();
}

// ====== 悬停高亮（临时克隆材质）======
function highlightHover(obj) {
    if (obj.userData._isShell) return; // 头/手/脚不响应悬停
    if (!isUsingSharedMaterial(obj)) return; // 已被选中，不覆盖

    const base = getBaseMaterial(obj);
    const cloned = base.clone();
    cloned.emissive = EMISSIVE_HOVER.clone();
    cloned.emissiveIntensity = 0.2; // 降低发光强度，更柔和
    cloned.color.copy(MUSCLE_HOVER);
    obj.material = cloned;
}

// ====== 选中高亮（临时克隆材质）======
function highlightSelect(obj) {
    // 如果当前是悬停克隆材质，先释放
    if (!isUsingSharedMaterial(obj)) {
        obj.material.dispose();
    }

    const base = getBaseMaterial(obj);
    const cloned = base.clone();
    cloned.emissive = EMISSIVE_SEL.clone();
    cloned.emissiveIntensity = 0.35; // 降低发光强度，更柔和
    cloned.color.copy(MUSCLE_SELECT);
    obj.material = cloned;
}

// ====== 恢复共享材质（释放克隆材质）======
function restoreSharedMaterial(obj) {
    if (!isUsingSharedMaterial(obj)) {
        obj.material.dispose(); // 释放克隆材质的 GPU 资源
        obj.material = getBaseMaterial(obj);
    }
}

// ====== 鼠标离开 ======
function onMouseLeave() {
    const tooltip = document.getElementById('muscle-tooltip');
    if (tooltip) tooltip.classList.remove('visible');

    if (hoveredObject && hoveredObject !== selected3DObject) {
        restoreSharedMaterial(hoveredObject);
        requestRender();
    }
    hoveredObject = null;
    document.body.style.cursor = 'default';

}  // autoRotate 已禁用

// ====== 窗口大小变化 ======
function onResize(container) {
    if (!renderer || !camera) return;
    const w = container.clientWidth;
    const h = container.clientHeight || 600;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    requestRender();
}

// ====== 加载提示 ======
function showLoadingText(container, text) {
    let el = container.querySelector('.glb-loading');
    if (!el) {
        el = document.createElement('div');
        el.className = 'glb-loading';
        el.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#8899aa;font-size:14px;z-index:10;text-align:center;';
        container.appendChild(el);
    }
    el.textContent = text;
}

function clearLoadingText(container) {
    const el = container.querySelector('.glb-loading');
    if (el) el.remove();
}

// ====== 外部批量高亮（首页多选联动）======
// 传入中文肌群名数组，高亮所有匹配的肌肉网格
window.setGLBSelection = function (cnNames) {
    if (!clickableObjects.length) return;

    // 清除旧高亮
    multiSelected.forEach(function (o) { restoreSharedMaterial(o); });
    multiSelected = [];
    if (selected3DObject) {
        restoreSharedMaterial(selected3DObject);
        selected3DObject = null;
    }

    const wanted = {};
    (cnNames || []).forEach(function (n) { wanted[n] = 1; });

    clickableObjects.forEach(function (o) {
        if (o.userData._isShell) return;
        const cn = mapMuscleName(o.userData.name || o.name);
        if (cn && wanted[cn]) {
            highlightSelect(o);
            multiSelected.push(o);
        }
    });
    requestRender();
};

// ====== 重置视角 ======
window.resetGLBView = function () {
    if (!controls || !camera) return;
    camera.position.set(0, 0.3, 5);
    controls.target.set(0, 0, 0);
    controls.azimuthAngle = Math.PI / 2;
    controls.polarAngle = Math.PI / 2;
    controls.update();

    multiSelected.forEach(function (o) { restoreSharedMaterial(o); });
    multiSelected = [];
    if (selected3DObject) {
        restoreSharedMaterial(selected3DObject);
        selected3DObject = null;
    }
    if (typeof window.selectMuscle === 'function') {
        window.selectMuscle('', null);
    }
    requestRender();
};

// ====== 按需渲染的动画循环 ======
let _disposed = false;
function animate() {
    if (_disposed) return;
    requestAnimationFrame(animate);

    // 自转时持续渲染
    if (controls.autoRotate) {
        controls.update();
        renderer.render(scene, camera);
        return;
    }

    // 阻尼动画期间持续渲染
    const hasDamping = controls.enableDamping && controls.getAzimuthalAngle !== undefined;

    if (needsRender || (controls.enableDamping && controls.update())) {
        controls.update();
        renderer.render(scene, camera);
        needsRender = false;
    }
}

// ====== 供 Vue 组件调用 ======
let _started = false;
export function initViewer() {
    _disposed = false;
    _started = true;
    window.initGLBViewer();
}
export function disposeViewer() {
    _started = false;
    _disposed = true;
    try {
        if (typeof renderer !== 'undefined' && renderer && renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
    } catch (e) {}
    try { if (typeof renderer !== 'undefined' && renderer) renderer.dispose(); } catch (e) {}
}
