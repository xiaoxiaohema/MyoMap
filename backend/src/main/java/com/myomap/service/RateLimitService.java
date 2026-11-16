package com.myomap.service;

import com.myomap.common.BizException;
import org.springframework.stereotype.Service;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 轻量级内存限流（滑动窗口）。按 key（如 客户端 IP + 动作）限制单位时间内的调用次数。
 * 单机内存实现，适合本项目规模；如需多实例可换成 Redis。
 */
@Service
public class RateLimitService {

    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    /**
     * 检查并记录一次调用。
     * @param key      限流键
     * @param max      窗口内允许的最大次数
     * @param windowMs 时间窗口（毫秒）
     * @param message  超限时抛出的提示
     */
    public void check(String key, int max, long windowMs, String message) {
        long now = System.currentTimeMillis();
        Deque<Long> dq = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (dq) {
            while (!dq.isEmpty() && now - dq.peekFirst() > windowMs) {
                dq.pollFirst();
            }
            if (dq.size() >= max) {
                throw new BizException(message);
            }
            dq.addLast(now);
        }
        // 粗粒度的内存保护：整体过大时清理已无时间戳的键
        if (hits.size() > 20000) {
            hits.entrySet().removeIf(e -> {
                Deque<Long> q = e.getValue();
                synchronized (q) {
                    return q.isEmpty() || (now - q.peekLast() > windowMs);
                }
            });
        }
    }
}
