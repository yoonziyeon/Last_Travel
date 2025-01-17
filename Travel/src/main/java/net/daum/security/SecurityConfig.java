package net.daum.security;


import java.util.UUID;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.authentication.rememberme.JdbcTokenRepositoryImpl;
import org.springframework.security.web.authentication.rememberme.PersistentTokenRepository;

@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {

	@Autowired
	DataSource dataSource; 
	@Autowired
	TravleUserService travleUserService;
	
	@Bean 
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}
	
	
	@Bean
    public CustomAuthenticationFailureHandler customAuthenticationFailureHandler() {
        return new CustomAuthenticationFailureHandler();
    }//로그인 실패 경우를 처리하는 핸들러
	
	@Override
    protected void configure(HttpSecurity http) throws Exception {
        http
        	//.csrf().disable()
        		.csrf()
        		.ignoringAntMatchers("/webendpoint") // 웹훅 엔드포인트를 CSRF 보호 예외에 추가
        		.and()
            	.authorizeRequests()
                .antMatchers("/Alert","/logout","/addschedule").access("hasRole('ADMIN') or hasRole('NOPAIDUSER') or hasRole('PAIDUSER')")
                //.antMatchers("/addschedule").hasRole("PAIDUSER")
                .antMatchers("/admin/**").hasRole("ADMIN")
                .and()  
            .formLogin()
                .loginPage("/login")
                .usernameParameter("member_id") 
                .passwordParameter("member_pwd")
                .loginProcessingUrl("/login_ok")
                .defaultSuccessUrl("/homepage") 
                .failureHandler(customAuthenticationFailureHandler())
                .permitAll()
                .and()
            .logout()
                .logoutUrl("/logout_ok")
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
                .logoutSuccessUrl("/homepage")
                .permitAll();
        
        http.exceptionHandling().accessDeniedPage("/accessDenied");
        //403 접근 금지 에러가 났을때 실행
        String rememberMeKey = UUID.randomUUID().toString();
        //복잡한 키를 생성
        
        http.rememberMe().key(rememberMeKey).userDetailsService(travleUserService)
		.tokenRepository(getJDBCRepository())
		.tokenValiditySeconds(60*60*24);
    }

	private PersistentTokenRepository getJDBCRepository() {
		JdbcTokenRepositoryImpl repo=new JdbcTokenRepositoryImpl();
		repo.setDataSource(dataSource);
		return repo;
	}
}

