package com.myomap.dto;

import lombok.Data;
import java.util.List;

@Data
public class PlanGenerateRequest {
    private String bodyPart;
    private String goal = "增肌";
    private Integer difficulty = 2;
    private Integer frequency = 3;
    private Integer duration = 4;
    private List<String> muscles;
    private Object miBandData;
}
