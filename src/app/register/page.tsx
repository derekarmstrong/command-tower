'use client';

import { Container, Paper, Title, TextInput, PasswordInput, Button, Text, Anchor } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconMail, IconLock, IconUser } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const router = useRouter();

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Invalid email'),
      password: (val) => (val.length < 6 ? 'Password must be at least 6 characters' : null),
      confirmPassword: (val, values) => (val !== values.password ? 'Passwords do not match' : null),
    },
  });

  const handleSubmit = async (values: { email: string; password: string }) => {
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    });

    if (error) {
      notifications.show({ title: 'Error', message: error.message, color: 'red' });
    } else {
      notifications.show({
        title: 'Account created!',
        message: 'You can now sign in with your credentials.',
        color: 'green',
      });
      router.push('/login');
    }
  };

  return (
    <Container size={420} py={80}>
      <Title ta="center" mb="lg">Create Account</Title>
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
            mb="md"
          />
          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm your password"
            required
            leftSection={<IconLock size={16} />}
            {...form.getInputProps('confirmPassword')}
            mb="lg"
          />
          <Button fullWidth type="submit">Create Account</Button>
        </form>
        <Text c="dimmed" size="sm" ta="center" mt="md">
          Already have an account?{' '}
          <Anchor component={Link} href="/login" size="sm">Sign in</Anchor>
        </Text>
      </Paper>
    </Container>
  );
}
