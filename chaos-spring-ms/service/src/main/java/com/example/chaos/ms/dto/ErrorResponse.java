package com.example.chaos.ms.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class ErrorResponse {
    private LocalDateTime timestamp;
    private String path;
    private String correlationId;
    private String errorCode;
    private String message;
}
