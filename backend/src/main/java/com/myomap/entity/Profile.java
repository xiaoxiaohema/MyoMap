package com.myomap.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("profile")
public class Profile {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String gender;
    private LocalDate birthdate;
    private Double height;
    private Double weight;
    private String goal;
    private String experience;
    private Double activity;
    private LocalDateTime updatedAt;
}
