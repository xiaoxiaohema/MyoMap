package com.myomap.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("workout_plan")
public class WorkoutPlan {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String name;
    private String goal;
    private Integer difficulty;
    private Integer frequency;
    private Integer weeks;
    /** 目标部位 JSON 字符串 */
    private String muscles;
    /** 训练日与动作 JSON 字符串 */
    private String days;
    private String source;
    private LocalDateTime createdAt;
}
