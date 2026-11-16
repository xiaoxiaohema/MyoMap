package com.myomap.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.myomap.entity.Profile;
import com.myomap.entity.User;
import com.myomap.mapper.ProfileMapper;
import com.myomap.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** 启动时创建演示账号 admin / 123456（若不存在） */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserMapper userMapper;
    private final ProfileMapper profileMapper;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @Override
    public void run(String... args) {
        Long count = userMapper.selectCount(new LambdaQueryWrapper<User>().eq(User::getUsername, "admin"));
        if (count != null && count > 0) {
            return;
        }
        User u = new User();
        u.setUsername("admin");
        u.setPassword(encoder.encode("123456"));
        u.setEmail("admin@myomap.local");
        u.setCreatedAt(LocalDateTime.now());
        userMapper.insert(u);

        Profile p = new Profile();
        p.setUserId(u.getId());
        p.setGender("male");
        p.setHeight(175.0);
        p.setWeight(70.0);
        p.setGoal("增肌");
        p.setExperience("新手");
        p.setActivity(1.375);
        profileMapper.insert(p);

        log.info("已创建演示账号 admin / 123456");
    }
}
