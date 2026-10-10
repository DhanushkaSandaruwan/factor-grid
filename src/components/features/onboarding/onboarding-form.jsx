'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FIELDS = [
  { id: 'firstName', label: 'First name', placeholder: 'e.g. Amanda', type: 'text', autoComplete: 'given-name' },
  { id: 'lastName', label: 'Last name', placeholder: 'e.g. Perera', type: 'text', autoComplete: 'family-name' },
  { id: 'contactNumber', label: 'Contact number', placeholder: 'e.g. +94 77 123 4567', type: 'tel', autoComplete: 'tel' },
  { id: 'companyName', label: 'Company name', placeholder: 'e.g. Altair Human Factors', type: 'text', autoComplete: 'organization' },
];

/**
 * Onboarding form collecting first name, last name, contact number and
 * company name. Submits to /api/onboarding, then routes to the dashboard.
 */
export function OnboardingForm({ initialData }) {
  const router = useRouter();
  const [values, setValues] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleChange = (id) => (event) => {
    setValues((prev) => ({ ...prev, [id]: event.target.value }));
    setErrors((prev) => ({ ...prev, [id]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!values.firstName?.trim()) next.firstName = 'First name is required';
    if (!values.lastName?.trim()) next.lastName = 'Last name is required';
    if (!values.contactNumber?.trim()) {
      next.contactNumber = 'Contact number is required';
    } else if (!/^[+()\-\s\d]+$/.test(values.contactNumber.trim())) {
      next.contactNumber = 'Contact number contains invalid characters';
    }
    if (!values.companyName?.trim()) next.companyName = 'Company name is required';
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        router.replace('/dashboard');
        return;
      }

      const data = await response.json().catch(() => null);
      if (response.status === 400 && data?.errors) {
        setErrors(data.errors);
      } else {
        setFormError('Something went wrong while saving your profile. Please try again.');
      }
    } catch {
      setFormError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-lg shadow-enterprise [--card-spacing:--spacing(6)]">
      <CardHeader>
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
        <img src="/logo.svg" alt="Factor Grid" className="h-9 w-auto" />
        <CardTitle className="text-xl">Welcome to Factor Grid</CardTitle>
        <CardDescription>
          Complete your profile to access the platform. This is needed only once.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} noValidate>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FIELDS.map(({ id, label, placeholder, type, autoComplete }) => (
              <div key={id} className="space-y-2">
                <Label htmlFor={id}>{label}</Label>
                <Input
                  id={id}
                  name={id}
                  type={type}
                  placeholder={placeholder}
                  autoComplete={autoComplete}
                  value={values[id] ?? ''}
                  onChange={handleChange(id)}
                  aria-invalid={Boolean(errors[id])}
                  disabled={submitting}
                />
                {errors[id] ? (
                  <p className="text-destructive text-xs">{errors[id]}</p>
                ) : null}
              </div>
            ))}
          </div>
          {formError ? <p className="text-destructive mt-4 text-xs">{formError}</p> : null}
        </CardContent>
        <CardFooter className="mt-2 justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Complete onboarding'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
