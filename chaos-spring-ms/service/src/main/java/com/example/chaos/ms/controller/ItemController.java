package com.example.chaos.ms.controller;

import com.example.chaos.ms.dto.EnrichedItemDTO;
import com.example.chaos.ms.dto.ItemDTO;
import com.example.chaos.ms.service.ItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;

    @PostMapping("/items")
    @ResponseStatus(HttpStatus.CREATED)
    public ItemDTO createItem(@RequestBody ItemDTO itemDTO) {
        try {
            System.out.println("CONTROLLER: Received request for " + itemDTO.getName());
            ItemDTO result = itemService.createItem(itemDTO);
            System.out.println("CONTROLLER: Successfully created item " + result.getId());
            return result;
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }

    @GetMapping("/items/{id}")
    public ItemDTO getItem(@PathVariable Long id) {
        return itemService.getItem(id);
    }

    @GetMapping("/enrich/{id}")
    public EnrichedItemDTO getEnrichedItem(@PathVariable Long id) {
        return itemService.getEnrichedItem(id);
    }
}
