package com.myomap;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * MyoMap 健身计划指南系统 · 后端入口
 */
@SpringBootApplication
@MapperScan("com.myomap.mapper")
public class MyoMapApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyoMapApplication.class, args);
        System.out.println("\n  MyoMap 后端已启动");
        System.out.println("  接口文档: http://localhost:8081/swagger-ui.html\n");
    }
}
