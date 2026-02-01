package com.example.chaos.ms.client;

import com.example.chaos.ms.dto.ExternalInfoDTO;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExternalServiceClient {

    private final RestTemplate restTemplate;

    @Value("${external.api.base-url}")
    private String externalApiBaseUrl;

    @CircuitBreaker(name = "externalApi", fallbackMethod = "externalApiFallback")
    public ExternalInfoDTO fetchExternalInfo(Long id) {
        String url = externalApiBaseUrl + "/external/info/" + id;
        log.info("Calling external API via client: {}", url);
        return restTemplate.getForObject(url, ExternalInfoDTO.class);
    }

    public ExternalInfoDTO externalApiFallback(Long id, Throwable t) {
        log.error("External API fallback triggered for id {}: {}", id, t.getMessage());
        return ExternalInfoDTO.builder()
                .id(id)
                .description("Service Unavailable (Fallback)")
                .status("ERROR")
                .build();
    }
}
