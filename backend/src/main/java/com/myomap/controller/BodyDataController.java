package com.myomap.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.myomap.common.R;
import com.myomap.entity.BodyMetric;
import com.myomap.mapper.BodyMetricMapper;
import com.myomap.security.UserContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Tag(name = "身体数据")
@RestController
@RequestMapping("/bodydata")
@RequiredArgsConstructor
public class BodyDataController {

    private final BodyMetricMapper mapper;

    @Operation(summary = "历史记录（按日期倒序）")
    @GetMapping("/history")
    public R<List<BodyMetric>> history() {
        Long uid = UserContext.require();
        List<BodyMetric> list = mapper.selectList(
                new LambdaQueryWrapper<BodyMetric>()
                        .eq(BodyMetric::getUserId, uid)
                        .orderByDesc(BodyMetric::getDate));
        return R.ok(list);
    }

    @Operation(summary = "新增/更新当日数据（按日期去重）")
    @PostMapping
    public R<BodyMetric> save(@RequestBody BodyMetric req) {
        Long uid = UserContext.require();
        req.setUserId(uid);
        if (req.getDate() == null) {
            req.setDate(LocalDate.now());
        }
        BodyMetric exist = mapper.selectOne(new LambdaQueryWrapper<BodyMetric>()
                .eq(BodyMetric::getUserId, uid)
                .eq(BodyMetric::getDate, req.getDate()));
        if (exist == null) {
            mapper.insert(req);
        } else {
            req.setId(exist.getId());
            mapper.updateById(req);
        }
        return R.ok(req);
    }

    @Operation(summary = "删除记录")
    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        Long uid = UserContext.require();
        mapper.delete(new LambdaQueryWrapper<BodyMetric>()
                .eq(BodyMetric::getId, id)
                .eq(BodyMetric::getUserId, uid));
        return R.ok();
    }
}
