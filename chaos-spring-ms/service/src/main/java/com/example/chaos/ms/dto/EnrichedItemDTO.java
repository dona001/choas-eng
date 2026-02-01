package com.example.chaos.ms.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnrichedItemDTO {
    private ItemDTO item;
    private ExternalInfoDTO externalInfo;
}
