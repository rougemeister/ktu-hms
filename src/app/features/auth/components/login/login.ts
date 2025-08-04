import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Auth } from '../../services/auth';
import { RoleInfo, LoginRequest, RegisterRequest, UserRole } from '../../model/auth.model';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  isLoginMode = true;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  private destroy$ = new Subject<void>();

  roles: RoleInfo[] = [
    {
      value: 'admin',
      label: 'Administrator',
      icon: '👨‍💼',
      color: '#dc2626',
      description: 'System administration and management'
    },
    {
      value: 'doctor',
      label: 'Doctor',
      icon: '👨‍⚕️',
      color: '#2563eb',
      description: 'Medical diagnosis and treatment'
    },
    {
      value: 'nurse',
      label: 'Nurse',
      icon: '👩‍⚕️',
      color: '#059669',
      description: 'Patient care and assistance'
    },
    {
      value: 'receptionist',
      label: 'Receptionist',
      icon: '👥',
      color: '#7c3aed',
      description: 'Front desk and appointments'
    },
    {
      value: 'patient',
      label: 'Patient',
      icon: '🙂',
      color: '#6b7280',
      description: 'Medical care recipient'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: Auth
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.subscribeToLoadingState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['patient', Validators.required]
    });

    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[+]?[\d\s-()]{10,}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      role: ['patient', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  private subscribeToLoadingState(): void {
    this.authService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading: boolean) => this.isLoading = loading);
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    if (confirmPassword?.errors?.['passwordMismatch']) {
      delete confirmPassword.errors['passwordMismatch'];
      if (Object.keys(confirmPassword.errors).length === 0) {
        confirmPassword.setErrors(null);
      }
    }
    
    return null;
  }

  onLogin(): void {
    if (this.loginForm.valid) {
      this.clearMessages();
      const credentials = this.loginForm.value as LoginRequest;
      
      this.authService.login(credentials)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.successMessage = response.message;
            // Navigation will be handled by auth guard
          },
          error: (error) => {
            this.errorMessage = error.message || 'Login failed. Please try again.';
          }
        });
    } else {
      this.markFormGroupTouched(this.loginForm);
    }
  }

  onRegister(): void {
    if (this.registerForm.valid) {
      this.clearMessages();
      const userData = this.registerForm.value as RegisterRequest;
      
      this.authService.register(userData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.successMessage = `${response.message}. Please login with your credentials.`;
            this.switchToLogin();
            this.registerForm.reset({ role: 'patient' });
          },
          error: (error) => {
            this.errorMessage = error.message || 'Registration failed. Please try again.';
          }
        });
    } else {
      this.markFormGroupTouched(this.registerForm);
    }
  }

  switchToLogin(): void {
    this.isLoginMode = true;
    this.clearMessages();
    this.loginForm.reset({ role: 'patient' });
  }

  switchToRegister(): void {
    this.isLoginMode = false;
    this.clearMessages();
    this.registerForm.reset({ role: 'patient' });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  hasFieldError(formGroup: FormGroup, fieldName: string): boolean {
    const field = formGroup.get(fieldName);
    return !!(field?.errors && field.touched);
  }

  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${this.getFieldDisplayName(fieldName)} is required`;
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['minlength']) {
        return `${this.getFieldDisplayName(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['pattern']) {
        if (fieldName === 'phoneNumber') return 'Please enter a valid phone number';
        return 'Invalid format';
      }
      if (field.errors['passwordMismatch']) return 'Passwords do not match';
    }
    
    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      phoneNumber: 'Phone number',
      password: 'Password',
      confirmPassword: 'Confirm password',
      role: 'Role'
    };
    return displayNames[fieldName] || fieldName;
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getRoleInfo(roleValue: UserRole): RoleInfo {
    return this.roles.find(role => role.value === roleValue) || this.roles[4];
  }
}