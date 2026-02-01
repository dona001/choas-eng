package com.example.chaos.ms.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExternalInfoDTO {
    private Long id;
    private String description;
    private String status;
}
