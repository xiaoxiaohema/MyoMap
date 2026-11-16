package com.myomap.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.myomap.common.BizException;
import com.myomap.dto.LoginRequest;
import com.myomap.dto.LoginResponse;
import com.myomap.dto.RegisterRequest;
import com.myomap.entity.Profile;
import com.myomap.entity.User;
import com.myomap.mapper.ProfileMapper;
import com.myomap.mapper.UserMapper;
import com.myomap.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final ProfileMapper profileMapper;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    /** 注册 */
    @Transactional
    public LoginResponse register(RegisterRequest req) {
        String username = req.getUsername() == null ? "" : req.getUsername().trim();
        String email = req.getEmail() == null ? "" : req.getEmail().trim();
        if (email.isEmpty()) email = null;

        Long exists = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getUsername, username));
        if (exists != null && exists > 0) {
            throw new BizException("用户名已存在");
        }
        User u = new User();
        u.setUsername(username);
        u.setPassword(encoder.encode(req.getPassword()));
        u.setEmail(email);
        u.setCreatedAt(LocalDateTime.now());
        try {
            userMapper.insert(u);
        } catch (DuplicateKeyException e) {
            // 并发注册同名用户时由数据库唯一索引兜底
            throw new BizException("用户名已存在");
        }

        // 初始化空档案
        Profile p = new Profile();
        p.setUserId(u.getId());
        p.setGender("male");
        p.setGoal("增肌");
        p.setExperience("新手");
        p.setActivity(1.375);
        profileMapper.insert(p);

        return new LoginResponse(u.getId(), u.getUsername(), u.getEmail(), jwtUtil.generate(u.getId(), u.getUsername()));
    }

    /** 登录 */
    public LoginResponse login(LoginRequest req) {
        User u = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getUsername, req.getUsername()));
        if (u == null) {
            throw new BizException("用户不存在");
        }
        if (!encoder.matches(req.getPassword(), u.getPassword())) {
            throw new BizException("密码错误");
        }
        return new LoginResponse(u.getId(), u.getUsername(), u.getEmail(), jwtUtil.generate(u.getId(), u.getUsername()));
    }

    public User getById(Long id) {
        return userMapper.selectById(id);
    }
}
