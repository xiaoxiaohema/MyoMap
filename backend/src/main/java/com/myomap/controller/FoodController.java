package com.myomap.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.myomap.common.R;
import com.myomap.dto.FoodAnalyzeRequest;
import com.myomap.entity.DietLog;
import com.myomap.mapper.DietLogMapper;
import com.myomap.security.UserContext;
import com.myomap.service.AiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "饮食")
@RestController
@RequestMapping("/food")
@RequiredArgsConstructor
public class FoodController {

    private final DietLogMapper mapper;
    private final AiService aiService;

    @Operation(summary = "当日热量合计")
    @GetMapping("/calories/{date}")
    public R<Double> calories(@PathVariable String date) {
        Long uid = UserContext.require();
        List<DietLog> list = mapper.selectList(new LambdaQueryWrapper<DietLog>()
                .eq(DietLog::getUserId, uid)
                .eq(DietLog::getDate, LocalDate.parse(date)));
        double sum = list.stream().mapToDouble(d -> d.getKcal() == null ? 0 : d.getKcal()).sum();
        return R.ok(Math.round(sum * 10) / 10.0);
    }

    @Operation(summary = "饮食记录列表")
    @GetMapping("/list")
    public R<List<DietLog>> list(@RequestParam(required = false) String date) {
        Long uid = UserContext.require();
        LambdaQueryWrapper<DietLog> qw = new LambdaQueryWrapper<DietLog>().eq(DietLog::getUserId, uid);
        if (date != null && !date.isBlank()) {
            qw.eq(DietLog::getDate, LocalDate.parse(date));
        }
        return R.ok(mapper.selectList(qw.orderByDesc(DietLog::getCreatedAt)));
    }

    @Operation(summary = "记录饮食")
    @PostMapping("/log")
    public R<DietLog> log(@RequestBody DietLog req) {
        Long uid = UserContext.require();
        req.setUserId(uid);
        if (req.getDate() == null) {
            req.setDate(LocalDate.now());
        }
        mapper.insert(req);
        return R.ok(req);
    }

    @Operation(summary = "AI 营养分析（文本或图片）")
    @PostMapping("/analyze")
    public R<Map<String, Object>> analyze(@RequestBody FoodAnalyzeRequest req) {
        UserContext.require();
        String analysis;
        if (req.getImage() != null && !req.getImage().isBlank()) {
            String prompt = "识别照片中的食物，估算分量（克）与热量、蛋白质、碳水、脂肪，只输出 JSON：" +
                    "{\"items\":[{\"name\":\"食物名\",\"grams\":200,\"kcal\":300,\"protein\":20,\"carb\":30,\"fat\":10}],\"note\":\"说明\"}";
            analysis = aiService.vision(req.getImage(), prompt);
        } else {
            String text = req.getText() != null ? req.getText()
                    : (req.getFoodName() == null ? "" : req.getFoodName() + " " + (req.getAmount() == null ? "" : req.getAmount() + "g"));
            analysis = aiService.analyzeFood(text);
        }
        Map<String, Object> data = new HashMap<>();
        data.put("aiAnalysis", analysis);
        return R.ok(data);
    }
}
