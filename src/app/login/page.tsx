'use client';

import { Container, Paper, Title, TextInput, PasswordInput, Button, Text, Anchor } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconMail, IconLock } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Invalid email'),
      password: (val) => (val.length < 6 ? 'Password must be at least 6 characters' : null),
    },
  });

  const handleSubmit = async (values: { email: string; password: string }) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
    } else {
      notifications.show({ title: 'Welcome back!', message: 'Signed in successfully', color: 'green' });
      router.push('/dashboard');
    }
  };

  return (
    <Container size={420} py={80}>
      <Title ta="center" mb="lg">Welcome Back</Title>
      <Paper withBorder shadow="md" p={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Email"
            placeholder="you@example.com"
            required
            leftSection={<IconMail size={16} />}
            {...form.getInputProps('email')}
            mb="md"
          />
          <PasswordInput
            label="Password"
            placeholder="Your password"
            required
            leftSection={<IconLock size={16} />}
            {...form.getInputProps('password')}
            mb="lg"
          />
          <Button fullWidth type="submit">Sign In</Button>
        </form>
        <Text c="dimmed" size="sm" ta="center" mt="md">
          Don&apos;t have an account?{' '}
          <Anchor component={Link} href="/register" size="sm">Register</Anchor>
        </Text>
      </Paper>
    </Container>
  );
}
