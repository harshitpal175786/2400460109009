import AppShell from "../components/AppShell";
import ThemeRegistry from "../components/ThemeRegistry";

export const metadata = {
  title: "Campus Notifications",
  description: "Campus notification dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <AppShell>{children}</AppShell>
        </ThemeRegistry>
      </body>
    </html>
  );
}
