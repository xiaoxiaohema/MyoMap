package com.myomap.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("diet_log")
public class DietLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private LocalDate date;
    private String meal;
    private String foodName;
    private Double grams;
    private Double kcal;
    private Double protein;
    private Double carb;
    private Double fat;
    private String raw;
    private LocalDateTime createdAt;
}
