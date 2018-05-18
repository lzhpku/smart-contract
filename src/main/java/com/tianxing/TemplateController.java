package com.tianxing;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import javax.servlet.http.HttpServletRequest;

/**
 * Created by lanzheng on 2018/4/28.
 */
@Controller
public class TemplateController {

    @GetMapping("/hello")
    String test(HttpServletRequest request) {
        request.setAttribute("hello", "hello world");
        return "/index";
    }
}
