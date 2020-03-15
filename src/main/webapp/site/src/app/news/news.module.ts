import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelineModule } from "../modules/timeline/timeline.module";
import { NewsComponent } from "./news.component";
import { MomentModule } from 'ngx-moment';
import { NewsRoutingModule } from "./news-routing.module";
import { MatButtonModule, MatCardModule, MatIconModule } from '@angular/material';
import { FlexLayoutModule } from '@angular/flex-layout';
import { SharedModule } from '../modules/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FlexLayoutModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MomentModule,
    NewsRoutingModule,
    TimelineModule,
    SharedModule,
    MatButtonModule
  ],
  declarations: [
    NewsComponent
  ],
  exports: [
    NewsComponent
  ]
})
export class NewsModule { }
