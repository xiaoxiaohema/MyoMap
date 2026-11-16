package com.myomap.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AiChatRequest {
    @NotBlank(message = "问题不能为空")
    private String question;
    /** 可选：图片 base64（data:image/...;base64,...），用于拍照识别 */
    private String image;
}
