package com.myomap.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("workout_log")
public class WorkoutLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String planName;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private Integer durationSec;
    private Double totalVolume;
    private Integer totalSets;
    private Integer calories;
    /** 动作明细 JSON 字符串 */
    private String exercises;
    private LocalDateTime createdAt;
}
