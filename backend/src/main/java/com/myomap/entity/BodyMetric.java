package com.myomap.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("body_metric")
public class BodyMetric {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private LocalDate date;
    private Double weight;
    private Double bodyFat;
    private Double chest;
    private Double waist;
    private Double hip;
    private Double arm;
    private Double thigh;
    private Double calf;
    private String note;
    private LocalDateTime createdAt;
}
