package com.myomap.dto;

import lombok.Data;

@Data
public class FoodAnalyzeRequest {
    /** 自然语言描述，如「2个鸡蛋、1杯牛奶」 */
    private String text;
    private String foodName;
    private Double amount;
    private Double calories;
    private Double protein;
    private Double fat;
    private Double carbohydrate;
    /** 可选：食物照片 base64 */
    private String image;
}
