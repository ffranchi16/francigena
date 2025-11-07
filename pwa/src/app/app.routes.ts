import { Routes } from "@angular/router";
import { HomePageComponent } from "./components/home/home-page/home-page.component";
import { Profilo } from "./components/commons/profilo/profilo";
import { PellegrinoHome } from "./components/pellegrino/home/pellegrino-home.component";
import { PellegrinoChecklist } from "./components/pellegrino/checklist/checklist";
import { GestoreHome } from "./components/gestore/home/gestore-home.component";
import { GestoreModify } from "./components/gestore/modify/gestore-modify.component";
import { AuthGuard } from "./guards/authGuard/auth-guard";

export const routes: Routes = [

    // Route pubbliche
    {path: '', component: HomePageComponent},

    // Route protette per il gestore
    {
        path: 'gestore',
        canActivate: [AuthGuard], // servizio per la protezione delle route
        data: {role: 'gestore'},
        children: [
            { path: 'home/:username', component: GestoreHome }, // path completo /gestore/home/:username
            { path: 'modify/:username', component: GestoreModify},
            { path: 'profilo/:username', component: Profilo},
        ]
    },

    // Route protette per il pellegrino
    {
        path: 'pellegrino',
        canActivate: [AuthGuard],
        data: {role: 'pellegrino'},
        children: [
            { path: 'home/:username', component: PellegrinoHome }, // path completo /pellegrino/home/:username
            { path: 'checklist/:username', component: PellegrinoChecklist },
            { path: 'profilo/:username', component: Profilo},
        ]
    },
    { path: '**', component: HomePageComponent }    
]; 
