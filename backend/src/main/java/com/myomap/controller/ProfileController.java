package com.myomap.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.myomap.common.R;
import com.myomap.entity.Profile;
import com.myomap.mapper.ProfileMapper;
import com.myomap.security.UserContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name = "个人档案")
@RestController
@RequestMapping("/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileMapper profileMapper;

    @Operation(summary = "获取档案")
    @GetMapping
    public R<Profile> get() {
        Long uid = UserContext.require();
        Profile p = profileMapper.selectOne(new LambdaQueryWrapper<Profile>().eq(Profile::getUserId, uid));
        if (p == null) {
            p = new Profile();
            p.setUserId(uid);
            p.setGender("male");
            p.setGoal("增肌");
            p.setExperience("新手");
            p.setActivity(1.375);
            profileMapper.insert(p);
        }
        return R.ok(p);
    }

    @Operation(summary = "保存档案")
    @PostMapping
    public R<Profile> save(@RequestBody Profile req) {
        Long uid = UserContext.require();
        Profile p = profileMapper.selectOne(new LambdaQueryWrapper<Profile>().eq(Profile::getUserId, uid));
        req.setUserId(uid);
        if (p == null) {
            profileMapper.insert(req);
            return R.ok(req);
        }
        req.setId(p.getId());
        profileMapper.updateById(req);
        return R.ok(req);
    }
}
