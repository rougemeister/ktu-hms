import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, tap, catchError } from 'rxjs/operators';
import { User, LoginRequest, AuthResponse, RegisterRequest, UserRole } from '../model/auth.model';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  

  private mockUsers: User[] = [
    {
      id: '1',
      email: 'admin@ktu.edu.gh',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      isActive: true,
      createdAt: new Date()
    }
  ];

  public currentUser$ = this.currentUserSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor() {
    // Check for stored user session
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        sessionStorage.removeItem('currentUser');
      }
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    this.isLoadingSubject.next(true);
    
    return this.simulateAuthRequest(credentials).pipe(
      delay(1500),
      tap(response => {
        this.setCurrentUser(response.user);
        this.isLoadingSubject.next(false);
      }),
      catchError(error => {
        this.isLoadingSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    this.isLoadingSubject.next(true);
    
    return this.simulateRegisterRequest(userData).pipe(
      delay(2000),
      tap(response => {
        // Add user to mock database
        if (response.user) {
          this.mockUsers.push(response.user);
        }
        this.isLoadingSubject.next(false);
      }),
      catchError(error => {
        this.isLoadingSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    sessionStorage.removeItem('currentUser');
    console.log('something happened')
    this.currentUserSubject.next(null);
  }

  private setCurrentUser(user: User): void {
    try {
      sessionStorage.setItem('currentUser', JSON.stringify(user));
      this.currentUserSubject.next(user);
    } catch (error) {
      console.error('Error storing user session:', error);
      this.currentUserSubject.next(user);
    }
  }

  private simulateAuthRequest(credentials: LoginRequest): Observable<AuthResponse> {
    // Check if user exists in mock database
    const existingUser = this.mockUsers.find(user => 
      user.email.toLowerCase() === credentials.email.toLowerCase()
    );

    if (!existingUser) {
      return throwError(() => ({ 
        message: 'User not found. Please check your email or register first.' 
      }));
    }

    // For demo purposes, accept any password for existing users except admin
    if (credentials.email === 'admin@ktu.edu.gh' && credentials.password !== 'admin123') {
      return throwError(() => ({ 
        message: 'Invalid credentials. Please check your email and password.' 
      }));
    }

    // Validate role matches
    if (existingUser.role !== credentials.role) {
      return throwError(() => ({ 
        message: `Invalid role selected. This account is registered as ${this.getRoleDisplayName(existingUser.role)}.` 
      }));
    }

    return of({ 
      user: existingUser, 
      token: this.generateMockToken(), 
      message: 'Login successful' 
    });
  }

  private simulateRegisterRequest(userData: RegisterRequest): Observable<AuthResponse> {
    // Check if user already exists
    const existingUser = this.mockUsers.find(user => 
      user.email.toLowerCase() === userData.email.toLowerCase()
    );

    if (existingUser) {
      return throwError(() => ({ 
        message: 'Email already exists. Please use a different email or try logging in.' 
      }));
    }

    // Validate phone number format more strictly
    if (!this.isValidPhoneNumber(userData.phoneNumber)) {
      return throwError(() => ({ 
        message: 'Please enter a valid phone number.' 
      }));
    }

    const newUser: User = {
      id: this.generateUserId(),
      email: userData.email.toLowerCase(),
      firstName: userData.firstName.trim(),
      lastName: userData.lastName.trim(),
      phoneNumber: userData.phoneNumber.trim(),
      role: userData.role,
      isActive: true,
      createdAt: new Date()
    };

    return of({ 
      user: newUser, 
      token: this.generateMockToken(), 
      message: 'Registration successful' 
    });
  }

  private isValidPhoneNumber(phone: string): boolean {
    // More comprehensive phone validation
    const phoneRegex = /^(\+233|0)[2-9]\d{8}$|^(\+\d{1,3})\d{7,14}$/;
    return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
  }

  private generateUserId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private generateMockToken(): string {
    return 'mock-jwt-token-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private getRoleDisplayName(role: UserRole): string {
    const roleNames = {
      admin: 'Administrator',
      doctor: 'Doctor',
      nurse: 'Nurse',
      receptionist: 'Receptionist',
      patient: 'Patient'
    };
    return roleNames[role] || role;
  }

  // Getters
  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.currentUserValue;
  }

  // Additional utility methods
  hasRole(role: UserRole): boolean {
    return this.currentUserValue?.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  getUserFullName(): string {
    const user = this.currentUserValue;
    return user ? `${user.firstName} ${user.lastName}` : '';
  }
}