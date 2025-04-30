import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ChartConfiguration } from 'chart.js';
import { environment } from '../../environments/environment';

interface DashboardStats {
  activeRooms: number;
  totalRooms: number;
  activeUsers: number;
  totalUsers: number;
  storageUsed: number;
  totalRecordings: number;
  messagesExchanged: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats = {
    activeRooms: 0,
    totalRooms: 0,
    activeUsers: 0,
    totalUsers: 0,
    storageUsed: 0,
    totalRecordings: 0,
    messagesExchanged: 0
  };
  
  loading = true;
  error = '';
  timeRange = '7d'; // Default time range: 7 days

  // Charts configuration
  userActivityChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Active Users',
        fill: true,
        tension: 0.5,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.3)'
      }
    ]
  };

  roomActivityChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Rooms Created',
        backgroundColor: 'rgba(54, 162, 235, 0.5)'
      },
      {
        data: [],
        label: 'Room Participants',
        backgroundColor: 'rgba(255, 99, 132, 0.5)'
      }
    ]
  };

  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchDashboardData();
  }

  fetchDashboardData(): void {
    this.loading = true;
    
    // In a real implementation, we would fetch this data from the API
    // For now, we're using mock data
    setTimeout(() => {
      // Simulate API call
      this.stats = {
        activeRooms: 12,
        totalRooms: 187,
        activeUsers: 45,
        totalUsers: 324,
        storageUsed: 2.4, // GB
        totalRecordings: 57,
        messagesExchanged: 4328
      };

      // Generate chart data
      const days = this.timeRange === '7d' ? 7 : this.timeRange === '30d' ? 30 : 90;
      const labels = Array.from({ length: days }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1) + i);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

      // User activity data
      const userActivityData = Array.from({ length: days }, () => 
        Math.floor(Math.random() * 50) + 10
      );

      // Room activity data
      const roomsCreatedData = Array.from({ length: days }, () => 
        Math.floor(Math.random() * 10)
      );
      
      const roomParticipantsData = Array.from({ length: days }, () => 
        Math.floor(Math.random() * 40) + 5
      );

      // Update chart data
      this.userActivityChartData = {
        labels,
        datasets: [{
          data: userActivityData,
          label: 'Active Users',
          fill: true,
          tension: 0.5,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.3)'
        }]
      };

      this.roomActivityChartData = {
        labels,
        datasets: [
          {
            data: roomsCreatedData,
            label: 'Rooms Created',
            backgroundColor: 'rgba(54, 162, 235, 0.5)'
          },
          {
            data: roomParticipantsData,
            label: 'Room Participants',
            backgroundColor: 'rgba(255, 99, 132, 0.5)'
          }
        ]
      };

      this.loading = false;
    }, 1000);
  }

  changeTimeRange(range: string): void {
    this.timeRange = range;
    this.fetchDashboardData();
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}