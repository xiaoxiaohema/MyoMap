package com.myomap.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.myomap.common.R;
import com.myomap.entity.WorkoutLog;
import com.myomap.mapper.WorkoutLogMapper;
import com.myomap.security.UserContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "训练记录")
@RestController
@RequestMapping("/workout")
@RequiredArgsConstructor
public class WorkoutController {

    private final WorkoutLogMapper mapper;

    @Operation(summary = "训练记录列表")
    @GetMapping("/list")
    public R<List<WorkoutLog>> list() {
        Long uid = UserContext.require();
        return R.ok(mapper.selectList(new LambdaQueryWrapper<WorkoutLog>()
                .eq(WorkoutLog::getUserId, uid)
                .orderByDesc(WorkoutLog::getStartedAt)));
    }

    @Operation(summary = "保存训练记录")
    @PostMapping("/log")
    public R<WorkoutLog> log(@RequestBody WorkoutLog req) {
        Long uid = UserContext.require();
        req.setUserId(uid);
        mapper.insert(req);
        return R.ok(req);
    }
}
