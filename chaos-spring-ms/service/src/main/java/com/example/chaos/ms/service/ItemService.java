package com.example.chaos.ms.service;

import com.example.chaos.ms.client.ExternalServiceClient;
import com.example.chaos.ms.dto.EnrichedItemDTO;
import com.example.chaos.ms.dto.ExternalInfoDTO;
import com.example.chaos.ms.dto.ItemDTO;
import com.example.chaos.ms.entity.Item;
import com.example.chaos.ms.repository.ItemRepository;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class ItemService {

    private final ItemRepository itemRepository;
    private final ExternalServiceClient externalServiceClient;

    @CachePut(value = "items", key = "#result.id")
    public ItemDTO createItem(ItemDTO itemDTO) {
        log.info("Creating item: {}", itemDTO.getName());
        Item item = Item.builder()
                .name(itemDTO.getName())
                .value(itemDTO.getValue())
                .build();
        Item saved = itemRepository.save(item);
        return mapToDTO(saved);
    }

    @Cacheable(value = "items", key = "#id")
    public ItemDTO getItem(Long id) {
        log.info("Fetching item from DB for id: {}", id);
        return itemRepository.findById(id)
                .map(this::mapToDTO)
                .orElseThrow(() -> new RuntimeException("Item not found: " + id));
    }

    public java.util.List<ItemDTO> getAllItems() {
        log.info("Fetching all items from DB");
        return itemRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(java.util.stream.Collectors.toList());
    }

    public EnrichedItemDTO getEnrichedItem(Long id) {
        ItemDTO item = getItem(id);
        ExternalInfoDTO externalInfo = externalServiceClient.fetchExternalInfo(id);
        return EnrichedItemDTO.builder()
                .item(item)
                .externalInfo(externalInfo)
                .build();
    }

    public ExternalInfoDTO fetchExternalInfo(Long id) {
        return externalServiceClient.fetchExternalInfo(id);
    }

    private ItemDTO mapToDTO(Item item) {
        return ItemDTO.builder()
                .id(item.getId())
                .name(item.getName())
                .value(item.getValue())
                // .createdAt(item.getCreatedAt())
                .build();
    }
}
