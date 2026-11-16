package com.myomap.controller;

import com.myomap.common.R;
import com.myomap.dto.AiChatRequest;
import com.myomap.service.AiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Tag(name = "AI 助手")
@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @Operation(summary = "AI 服务状态（服务端是否已配置 Key，供前端展示）")
    @GetMapping("/status")
    public R<Map<String, Object>> status() {
        Map<String, Object> data = new HashMap<>();
        data.put("enabled", aiService.enabled());
        data.put("model", aiService.model());
        return R.ok(data);
    }

    @Operation(summary = "AI 问答（服务端代理，Key 不暴露；无需登录）")
    @PostMapping("/chat")
    public R<Map<String, Object>> chat(@Valid @RequestBody AiChatRequest req) {
        String answer = req.getImage() != null && !req.getImage().isBlank()
                ? aiService.vision(req.getImage(), req.getQuestion())
                : aiService.chat(req.getQuestion());
        Map<String, Object> data = new HashMap<>();
        data.put("question", req.getQuestion());
        data.put("answer", answer);
        data.put("server", aiService.enabled());
        return R.ok(data);
    }
}
