package com.myomap.controller;

import com.myomap.common.BizException;
import com.myomap.common.ClientIp;
import com.myomap.common.R;
import com.myomap.dto.LoginRequest;
import com.myomap.dto.LoginResponse;
import com.myomap.dto.RegisterRequest;
import com.myomap.entity.User;
import com.myomap.security.UserContext;
import com.myomap.service.CaptchaService;
import com.myomap.service.RateLimitService;
import com.myomap.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Tag(name = "用户", description = "注册 / 登录 / 当前用户")
@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final CaptchaService captchaService;
    private final RateLimitService rateLimitService;

    @Operation(summary = "获取注册验证码（算术题）")
    @GetMapping("/captcha")
    public R<Map<String, String>> captcha() {
        return R.ok(captchaService.generate());
    }

    @Operation(summary = "注册")
    @PostMapping("/register")
    public R<LoginResponse> register(HttpServletRequest request, @Valid @RequestBody RegisterRequest req) {
        // 1) 同一 IP 10 分钟内最多注册 8 次，遏制批量注册
        rateLimitService.check("reg:" + ClientIp.of(request), 8, 10 * 60 * 1000L, "注册过于频繁，请 10 分钟后再试");
        // 2) 验证码（一次性）
        if (!captchaService.verify(req.getCaptchaId(), req.getCaptchaAnswer())) {
            throw new BizException("验证码错误或已过期，请重新获取");
        }
        return R.ok(userService.register(req));
    }

    @Operation(summary = "登录")
    @PostMapping("/login")
    public R<LoginResponse> login(HttpServletRequest request, @Valid @RequestBody LoginRequest req) {
        // 同一 IP 10 分钟内最多尝试 20 次，缓解撞库/暴力破解
        rateLimitService.check("login:" + ClientIp.of(request), 20, 10 * 60 * 1000L, "尝试过于频繁，请稍后再试");
        return R.ok(userService.login(req));
    }

    @Operation(summary = "当前登录用户")
    @GetMapping("/me")
    public R<Map<String, Object>> me() {
        User u = userService.getById(UserContext.require());
        Map<String, Object> m = new HashMap<>();
        m.put("id", u.getId());
        m.put("username", u.getUsername());
        m.put("email", u.getEmail());
        return R.ok(m);
    }
}
