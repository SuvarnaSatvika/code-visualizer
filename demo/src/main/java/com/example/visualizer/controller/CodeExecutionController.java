package com.example.visualizer.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/code")
@CrossOrigin(origins = "*")
public class CodeExecutionController {

    private final RestClient restClient;
    private final String pythonEngineUrl;

    public CodeExecutionController(@Value("${python.engine.url}") String pythonEngineUrl) {
        this.pythonEngineUrl = pythonEngineUrl;
        this.restClient = RestClient.create();
    }

    @PostMapping("/execute")
    @Cacheable(value = "codeExecutions", key = "#payload['code']")
    public ResponseEntity<String> proxyExecution(@RequestBody Map<String, String> payload) {
        System.out.println("Cache miss! Forwarding request to Python engine...");
        
        String response = restClient.post()
                .uri(pythonEngineUrl)
                .body(payload)
                .retrieve()
                .body(String.class);

        return ResponseEntity.ok(response);
    }
}