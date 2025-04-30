import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styles: []
})
export class AppComponent {
  title = 'Unified Collaboration Platform';
  
  // Navigation menu items
  navItems = [
    { name: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { name: 'Rooms', icon: 'meeting_room', route: '/rooms' },
    { name: 'Users', icon: 'people', route: '/users' },
    { name: 'Analytics', icon: 'analytics', route: '/analytics' },
    { name: 'Settings', icon: 'settings', route: '/settings' }
  ];

  constructor() {}
}