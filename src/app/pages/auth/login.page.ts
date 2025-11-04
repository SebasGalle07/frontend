import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-login-page',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [FormsModule, CommonModule, RouterModule]
})
export class LoginPage implements OnInit {
  email = '';
  password = '';
  error = '';
  isLoading = false;
  returnUrl = '/home';

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) {
      this.returnUrl = returnUrl;
    }
  }

  login(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.error = '';
    this.isLoading = true;

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        const target = this.returnUrl?.startsWith('/') ? this.returnUrl : '/home';
        this.router.navigateByUrl(target);
      },
      error: (err) => {
        this.isLoading = false;
        const serverMessage =
          err?.error?.message ||
          err?.error?.detail ||
          err?.error?.error_description;
        this.error = serverMessage || 'Credenciales incorrectas';
      }
    });
  }
}
