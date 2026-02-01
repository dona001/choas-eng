package com.example.chaos.ms.dto;

import lombok.*;
import java.time.LocalDateTime;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemDTO implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long id;
    private String name;
    private Double value;
    // private LocalDateTime createdAt;
}

// Separate file or same? I'll do separate for clarity in real project.
