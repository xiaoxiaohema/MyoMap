package com.myomap.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.myomap.common.R;
import com.myomap.dto.PlanGenerateRequest;
import com.myomap.entity.WorkoutPlan;
import com.myomap.mapper.WorkoutPlanMapper;
import com.myomap.security.UserContext;
import com.myomap.service.AiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Slf4j
@Tag(name = "训练计划")
@RestController
@RequestMapping("/plan")
@RequiredArgsConstructor
public class PlanController {

    private final WorkoutPlanMapper mapper;
    private final AiService aiService;
    private final ObjectMapper json = new ObjectMapper();

    private static final String[] DAY_NAMES = {"周一", "周二", "周三", "周四", "周五", "周六", "周日"};

    @Operation(summary = "计划列表")
    @GetMapping("/list")
    public R<List<WorkoutPlan>> list() {
        Long uid = UserContext.require();
        return R.ok(mapper.selectList(new LambdaQueryWrapper<WorkoutPlan>()
                .eq(WorkoutPlan::getUserId, uid)
                .orderByDesc(WorkoutPlan::getCreatedAt)));
    }

    @Operation(summary = "生成训练计划（优先 AI，失败回退算法）")
    @PostMapping("/generate")
    public R<Map<String, Object>> generate(@RequestBody PlanGenerateRequest req) {
        UserContext.require();
        int diff = req.getDifficulty() == null ? 2 : req.getDifficulty();
        int freq = req.getFrequency() == null ? 3 : req.getFrequency();
        int weeks = req.getDuration() == null ? 4 : req.getDuration();
        String goal = req.getGoal() == null ? "增肌" : req.getGoal();
        List<String> muscles = (req.getMuscles() == null || req.getMuscles().isEmpty())
                ? List.of("胸大肌", "背阔肌", "股四头肌", "腹直肌") : req.getMuscles();

        // 1) 优先使用 AI 生成
        if (aiService.enabled()) {
            try {
                Map<String, Object> plan = aiPlan(goal, diff, freq, weeks, muscles);
                if (plan != null) {
                    return R.ok(plan);
                }
                log.warn("AI 返回的计划无法解析，回退算法生成");
            } catch (Exception e) {
                log.warn("AI 生成计划失败，回退算法生成：{}", e.getMessage());
            }
        }

        // 2) 本地算法回退
        return R.ok(algorithmPlan(goal, diff, freq, weeks, muscles));
    }

    @Operation(summary = "保存计划")
    @PostMapping("/save")
    public R<WorkoutPlan> save(@RequestBody WorkoutPlan plan) {
        Long uid = UserContext.require();
        plan.setUserId(uid);
        if (plan.getId() == null) {
            mapper.insert(plan);
        } else {
            mapper.updateById(plan);
        }
        return R.ok(plan);
    }

    @Operation(summary = "删除计划")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        Long uid = UserContext.require();
        mapper.delete(new LambdaQueryWrapper<WorkoutPlan>()
                .eq(WorkoutPlan::getId, id)
                .eq(WorkoutPlan::getUserId, uid));
        return R.ok();
    }

    // ================= AI 生成 =================

    private Map<String, Object> aiPlan(String goal, int diff, int freq, int weeks, List<String> muscles) {
        String text = aiService.generatePlan(buildPrompt(goal, diff, freq, weeks, muscles));
        JsonNode root = parseJson(text);
        if (root == null) return null;
        JsonNode daysNode = root.path("days");
        if (!daysNode.isArray() || daysNode.isEmpty()) return null;

        int[] sch = scheme(goal, diff);
        int defSets = sch[0], defRest = sch[2];
        String defReps = repsOf(goal);

        List<Map<String, Object>> days = new ArrayList<>();
        int di = 0;
        for (JsonNode d : daysNode) {
            String fallbackMuscle = muscles.get(di % muscles.size());
            List<String> focus = new ArrayList<>();
            JsonNode fn = d.path("focus");
            if (fn.isArray()) {
                for (JsonNode f : fn) {
                    String s = f.asText("").trim();
                    if (!s.isEmpty()) focus.add(s);
                }
            }
            if (focus.isEmpty()) focus.add(fallbackMuscle);

            List<Map<String, Object>> exs = new ArrayList<>();
            JsonNode en = d.path("exercises");
            if (en.isArray()) {
                for (JsonNode e : en) {
                    String nm = e.path("name").asText("").trim();
                    if (nm.isEmpty()) continue;
                    Map<String, Object> ex = new LinkedHashMap<>();
                    ex.put("name", nm);
                    ex.put("muscle", e.path("muscle").asText(focus.get(0)));
                    ex.put("sets", clamp(e.path("sets").asInt(defSets), 1, 6));
                    ex.put("reps", e.path("reps").asText(defReps));
                    ex.put("rest", clamp(e.path("rest").asInt(defRest), 20, 300));
                    String note = e.path("note").asText("").trim();
                    if (!note.isEmpty()) ex.put("note", note);
                    exs.add(ex);
                }
            }
            if (exs.isEmpty()) continue;

            Map<String, Object> day = new LinkedHashMap<>();
            day.put("day", d.path("day").asText(DAY_NAMES[di % 7]));
            day.put("name", d.path("name").asText(focus.get(0) + "日"));
            day.put("focus", focus);
            day.put("exercises", exs);
            days.add(day);
            di++;
        }
        if (days.isEmpty()) return null;

        List<String> tips = new ArrayList<>();
        JsonNode tn = root.path("tips");
        if (tn.isArray()) {
            for (JsonNode t : tn) {
                String s = t.asText("").trim();
                if (!s.isEmpty()) tips.add(s);
            }
        }
        if (tips.isEmpty()) {
            tips.add("训练前热身 5-10 分钟，训练后拉伸放松");
            tips.add("遵循渐进超负荷，每 1-2 周适度增加重量或次数");
            tips.add("保证每晚 7-9 小时睡眠，同一肌群间隔 48 小时");
        }

        Map<String, Object> data = new LinkedHashMap<>();
        String defaultName = String.join("·", muscles.subList(0, Math.min(2, muscles.size()))) + goal + "计划";
        data.put("planName", root.path("name").asText(defaultName));
        data.put("goal", goal);
        data.put("frequency", days.size());
        data.put("weeks", weeks);
        data.put("difficulty", diff);
        data.put("duration", "60");
        data.put("description", root.path("description").asText(
                "AI 已根据你的目标「" + goal + "」与训练部位生成 " + days.size() + " 天/周 的个性化计划。"));
        data.put("tips", tips);
        data.put("days", days);
        data.put("source", "ai");
        return data;
    }

    private String buildPrompt(String goal, int diff, int freq, int weeks, List<String> muscles) {
        String level = diff >= 3 ? "高级" : diff == 2 ? "中级" : "新手";
        StringBuilder cand = new StringBuilder();
        for (String m : muscles) {
            cand.append("  · ").append(m).append("：").append(String.join("、", poolOf(m))).append("\n");
        }
        return "请为以下用户生成一个周期化训练计划，只返回 JSON：\n"
                + "- 目标：" + goal + "\n"
                + "- 训练水平：" + level + "\n"
                + "- 每周训练天数：" + freq + "\n"
                + "- 计划周期：" + weeks + " 周\n"
                + "- 重点训练部位：" + String.join("、", muscles) + "\n\n"
                + "可用动作库（请优先从中挑选，动作名称务必与下列保持一致）：\n" + cand
                + "\n返回 JSON 结构（字段名严格一致）：\n"
                + "{\n"
                + "  \"name\": \"计划名称\",\n"
                + "  \"description\": \"一句话总体说明\",\n"
                + "  \"days\": [\n"
                + "    { \"day\": \"周一\", \"name\": \"训练日主题\", \"focus\": [\"胸大肌\"],\n"
                + "      \"exercises\": [ { \"name\": \"杠铃卧推\", \"muscle\": \"胸大肌\", \"sets\": 4, \"reps\": \"8-12\", \"rest\": 90, \"note\": \"动作要点\" } ] }\n"
                + "  ],\n"
                + "  \"tips\": [\"训练前热身 5-10 分钟\", \"遵循渐进超负荷\"]\n"
                + "}\n"
                + "约束：days 数量为 " + freq + "；每个训练日 4-5 个动作；sets 为整数；reps 为区间字符串；rest 为秒数整数；note 为不超过 10 字的要点；description 不超过 30 字；请保持精简以减少生成时间。";
    }

    private JsonNode parseJson(String text) {
        if (text == null) return null;
        String t = text.trim();
        int a = t.indexOf('{');
        int b = t.lastIndexOf('}');
        if (a < 0 || b <= a) return null;
        try {
            return json.readTree(t.substring(a, b + 1));
        } catch (Exception e) {
            return null;
        }
    }

    // ================= 算法回退 =================

    private Map<String, Object> algorithmPlan(String goal, int diff, int freq, int weeks, List<String> muscles) {
        int[] sch = scheme(goal, diff);
        int sets = sch[0], rest = sch[2];
        String reps = repsOf(goal);

        List<Map<String, Object>> days = new ArrayList<>();
        for (int i = 0; i < freq; i++) {
            String focus = muscles.get(i % muscles.size());
            Map<String, Object> day = new LinkedHashMap<>();
            day.put("day", DAY_NAMES[i % 7]);
            day.put("name", focus + "日");
            day.put("focus", List.of(focus));
            List<Map<String, Object>> exs = new ArrayList<>();
            String[] pool = poolOf(focus);
            int per = Math.min(pool.length, 4 + diff);
            for (int k = 0; k < per; k++) {
                Map<String, Object> e = new LinkedHashMap<>();
                e.put("name", pool[k]);
                e.put("muscle", focus);
                e.put("sets", sets);
                e.put("reps", reps);
                e.put("rest", rest);
                exs.add(e);
            }
            day.put("exercises", exs);
            days.add(day);
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("planName", String.join("·", muscles.subList(0, Math.min(2, muscles.size()))) + goal + "计划");
        data.put("goal", goal);
        data.put("frequency", freq);
        data.put("weeks", weeks);
        data.put("difficulty", diff);
        data.put("duration", "60");
        data.put("description", "系统已根据你的目标「" + goal + "」与训练部位生成 " + freq + " 天/周 的计划，建议每次训练前热身 5-10 分钟，组间休息 " + rest + " 秒。");
        data.put("tips", List.of("训练前热身 5-10 分钟", "遵循渐进超负荷", "保证充足睡眠与恢复"));
        data.put("days", days);
        data.put("source", "algorithm");
        return data;
    }

    private int[] scheme(String goal, int diff) {
        int sets = Math.min(5, 2 + diff);
        int restBase = goal.equals("增肌") ? 90 : 60;
        int rest = Math.max(30, restBase - (diff - 1) * 15);
        return new int[]{sets, 0, rest};
    }

    private String repsOf(String goal) {
        return switch (goal) {
            case "减脂", "塑形" -> "12-15";
            case "耐力" -> "15-20";
            default -> "8-12";
        };
    }

    private int clamp(int v, int lo, int hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    private String[] poolOf(String muscle) {
        return switch (muscle) {
            case "胸大肌" -> new String[]{"杠铃卧推", "上斜哑铃卧推", "哑铃飞鸟", "俯卧撑", "绳索夹胸"};
            case "背阔肌" -> new String[]{"引体向上", "杠铃俯身划船", "高位下拉", "坐姿绳索划船", "单臂哑铃划船"};
            case "肩前束", "三角肌" -> new String[]{"哑铃推举", "杠铃推举", "哑铃前平举", "绳索前平举"};
            case "肩后束" -> new String[]{"俯身哑铃飞鸟", "绳索面拉", "反向蝴蝶机", "绳索后束划船"};
            case "肱二头肌" -> new String[]{"杠铃弯举", "哑铃交替弯举", "锤式弯举", "牧师凳弯举"};
            case "肱三头肌" -> new String[]{"绳索下压", "窄距卧推", "仰卧臂屈伸", "双杠臂屈伸"};
            case "腹直肌", "腹肌" -> new String[]{"卷腹", "悬垂举腿", "平板支撑", "反向卷腹"};
            case "腹外斜肌" -> new String[]{"俄罗斯转体", "侧平板支撑", "绳索转体", "哑铃侧屈"};
            case "股四头肌" -> new String[]{"杠铃深蹲", "腿举", "腿屈伸", "箭步蹲", "哈克深蹲"};
            case "腘绳肌" -> new String[]{"罗马尼亚硬拉", "腿弯举", "臀桥", "直腿硬拉"};
            case "臀大肌" -> new String[]{"臀推", "相扑硬拉", "髋外展", "单腿臀桥"};
            case "小腿肌群" -> new String[]{"站姿提踵", "坐姿提踵", "单腿提踵", "驴式提踵"};
            case "斜方肌" -> new String[]{"杠铃耸肩", "哑铃耸肩", "绳索耸肩", "杠铃直立划船"};
            case "中背部" -> new String[]{"反向飞鸟", "器械俯身划船", "T杆划船", "器械反向飞鸟"};
            case "下背部" -> new String[]{"硬拉", "山羊挺身", "早安式", "器械背屈伸"};
            case "前臂肌群" -> new String[]{"腕弯举", "反向腕弯举", "农夫行走"};
            case "内收肌群" -> new String[]{"坐姿内收", "绳索内收", "相扑深蹲", "侧弓步"};
            default -> new String[]{"杠铃卧推", "杠铃深蹲", "杠铃俯身划船", "哑铃推举"};
        };
    }
}
