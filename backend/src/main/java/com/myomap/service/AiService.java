package com.myomap.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * AI 服务：服务端代理调用大模型（OpenAI 兼容协议）
 * 好处：API Key 保存在服务端，前端不暴露；并统一做降级。
 */
@Slf4j
@Service
public class AiService {

    @Value("${myomap.ai.base-url}")
    private String baseUrl;
    @Value("${myomap.ai.api-key:}")
    private String apiKey;
    @Value("${myomap.ai.model}")
    private String model;
    @Value("${myomap.ai.vision-model}")
    private String visionModel;

    private final RestClient rest = RestClient.create();
    private final ObjectMapper json = new ObjectMapper();

    private static final String COACH_SYSTEM =
            "你是 MyoMap 的专业健身助手，擅长训练方法、动作纠正、营养知识与伤病预防。回答专业、简洁、可执行，用中文，适当分点。涉及医疗问题时提醒用户咨询专业人士。";

    private static final String PLAN_SYSTEM =
            "你是 MyoMap 的专业健身教练。你只输出一个 JSON 对象，不要输出任何解释文字，也不要用 Markdown 代码块包裹。";

    public boolean enabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    /** 当前服务端使用的对话模型名（用于前端展示） */
    public String model() {
        return model;
    }

    /**
     * 生成训练计划：把提示词交给大模型，返回其原始文本（由调用方负责解析与校验）。
     * 未启用或调用异常时抛出异常，交由上层回退到本地算法。
     */
    public String generatePlan(String prompt) {
        if (!enabled()) {
            throw new IllegalStateException("服务端未配置 AI Key");
        }
        ObjectNode body = json.createObjectNode();
        body.put("model", model);
        body.put("temperature", 0.5);
        body.put("max_tokens", 2000);
        ArrayNode messages = body.putArray("messages");
        addMessage(messages, "system", PLAN_SYSTEM);
        addMessage(messages, "user", prompt);
        return callChat(body);
    }

    /** 文本对话 */
    public String chat(String question) {
        if (!enabled()) {
            return localAnswer(question);
        }
        try {
            ObjectNode body = json.createObjectNode();
            body.put("model", model);
            body.put("temperature", 0.7);
            ArrayNode messages = body.putArray("messages");
            addMessage(messages, "system", COACH_SYSTEM);
            addMessage(messages, "user", question);
            return callChat(body);
        } catch (Exception e) {
            log.warn("AI 调用失败，降级为本地回答：{}", e.getMessage());
            return localAnswer(question);
        }
    }

    /** 图片理解（食物识别） */
    public String vision(String imageDataUrl, String prompt) {
        if (!enabled()) {
            throw new RuntimeException("服务端未配置 AI Key（myomap.ai.api-key）");
        }
        ObjectNode body = json.createObjectNode();
        body.put("model", visionModel);
        body.put("temperature", 0.2);
        ArrayNode messages = body.putArray("messages");
        addMessage(messages, "system", "你是专业营养师，只输出 JSON，不要多余文字。");
        ObjectNode userMsg = messages.addObject();
        userMsg.put("role", "user");
        ArrayNode content = userMsg.putArray("content");
        ObjectNode textNode = content.addObject();
        textNode.put("type", "text");
        textNode.put("text", prompt);
        ObjectNode imgNode = content.addObject();
        imgNode.put("type", "image_url");
        imgNode.putObject("image_url").put("url", imageDataUrl);
        return callChat(body);
    }

    /** 饮食文本解析 */
    public String analyzeFood(String text) {
        if (!enabled()) {
            return "（服务端未配置 AI，使用本地估算）已记录：" + text + "。建议结合食物库核对热量与三大营养素。";
        }
        String prompt = "请解析以下饮食描述，估算总热量与蛋白质/碳水/脂肪（克），用一段中文给出简短分析与建议：\n" + text;
        return chat(prompt);
    }

    // ---------- 内部 ----------
    private void addMessage(ArrayNode messages, String role, String content) {
        ObjectNode m = messages.addObject();
        m.put("role", role);
        m.put("content", content);
    }

    private String callChat(ObjectNode body) {
        String url = baseUrl.replaceAll("/+$", "") + "/chat/completions";
        String resp = rest.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + apiKey)
                .body(body.toString())
                .retrieve()
                .body(String.class);
        try {
            JsonNode root = json.readTree(resp);
            JsonNode choices = root.path("choices");
            if (choices.isArray() && choices.size() > 0) {
                return choices.get(0).path("message").path("content").asText("");
            }
            return "AI 返回格式异常：" + resp;
        } catch (Exception e) {
            return "AI 返回解析失败：" + e.getMessage();
        }
    }

    /** 未配置 Key 时的本地兜底回答 */
    private String localAnswer(String q) {
        String s = q == null ? "" : q;
        List<Object[]> kb = new ArrayList<>(List.of(
                new Object[]{"增肌", "增肌三要素：① 渐进超负荷（每周增加重量或次数）；② 热量盈余（每日比 TDEE 多 200-300 kcal）；③ 蛋白质充足（每公斤体重 1.6-2.2g）。以复合动作为主，每周 3-5 次，保证 7-9 小时睡眠。"},
                new Object[]{"减脂", "减脂核心是热量缺口：每日比 TDEE 少 300-500 kcal，配合力量训练保住肌肉。蛋白质每公斤体重 2.0-2.2g，每周减重 0.5-1% 体重较可持续。"},
                new Object[]{"深蹲", "深蹲膝盖疼常见原因：膝盖内扣、深度过大、重量过大。建议降重量、做箱式深蹲控制深度，并加强臀中肌与踝关节活动度。持续疼痛请就医。"},
                new Object[]{"卧推", "突破卧推瓶颈：增加三头与肩前束辅助训练、采用周期化与减载周、提升胸部训练容量、注意肩胛稳定与腿部驱动。"},
                new Object[]{"硬拉", "硬拉护腰：杠铃贴近小腿、背部中立、用腿蹬地而非用腰拉起、核心绷紧（瓦式呼吸）、大重量用腰带。刺痛需立即停止。"},
                new Object[]{"蛋白质", "蛋白质建议：增肌 1.6-2.2g/kg，减脂 2.0-2.2g/kg，维持 1.2-1.6g/kg。优质来源：鸡胸、牛肉、鱼虾、鸡蛋、牛奶、豆制品、蛋白粉。"},
                new Object[]{"恢复", "肌肉在休息时生长。每晚 7-9 小时睡眠，同一肌群间隔 48 小时。过度训练信号：静息心率升高、力量下降、情绪低落——应安排减载周。"},
                new Object[]{"新手", "新手建议每周 3 次全身训练，每次 6-8 个复合动作，每个 3 组 × 8-12 次。先掌握动作模式再增加重量。"}
        ));
        for (Object[] kv : kb) {
            if (s.contains((String) kv[0])) {
                return (String) kv[1];
            }
        }
        return "这是一个很好的健身问题。一般遵循「渐进超负荷 + 充足蛋白质 + 规律睡眠」三大原则。你可以问关于增肌、减脂、具体动作（深蹲/卧推/硬拉）、营养分配或训练恢复的问题。\n\n（提示：服务端未配置 AI Key，当前为本地知识库回答。）";
    }
}
