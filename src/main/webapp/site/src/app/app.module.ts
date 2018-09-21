import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { ConfigService } from "./services/config.service";
import { HeaderModule } from './modules/header/header.module';
import { HomeModule } from "./home/home.module";
import { FooterModule } from './modules/footer/footer.module';
import { LoginModule } from "./login/login.module";
import { StudentModule } from './student/student.module';
import { StudentService } from './student/student.service';
import { TeacherModule } from './teacher/teacher.module';
import { UserService } from './services/user.service';
import { TeacherService } from "./teacher/teacher.service";
import { CommonModule } from "@angular/common";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { RegisterModule } from "./register/register.module";

import {
  SocialLoginModule,
  AuthServiceConfig,
  GoogleLoginProvider,
} from "angularx-social-login";

export function initialize(configService: ConfigService, userService: UserService): () => Promise<any> {
  return (): Promise<any> => {
    return userService.retrieveUserPromise().then((user) => {
      userService.getUser().subscribe((user) => {
        configService.retrieveConfig(user);
      });
    });
  }
}

export function getAuthServiceConfigs(configService: ConfigService) {
  const autServiceConfig: AuthServiceConfig = new AuthServiceConfig([]);
  configService.getConfig().subscribe((config) => {
    if (config != null) {
      if (configService.getGoogleClientId() != null) {
        autServiceConfig.providers.set(GoogleLoginProvider.PROVIDER_ID,
          new GoogleLoginProvider(configService.getGoogleClientId()));
      }
    }
  });
  return autServiceConfig;
}

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    FooterModule,
    HeaderModule,
    HomeModule,
    LoginModule,
    RegisterModule,
    StudentModule,
    TeacherModule,
    SocialLoginModule
  ],
  providers: [
    ConfigService,
    StudentService,
    TeacherService,
    UserService,
    {
      provide: APP_INITIALIZER,
      useFactory: initialize,
      deps: [
        ConfigService,
        UserService
      ],
      multi: true
    },
    {
      provide: AuthServiceConfig,
      useFactory: getAuthServiceConfigs,
      deps: [
        ConfigService
      ]
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
