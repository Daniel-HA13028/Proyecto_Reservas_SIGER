package com.project.siger;

import org.springframework.boot.SpringApplication;

public class TestSigerApplication {

	public static void main(String[] args) {
		SpringApplication.from(SigerApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
