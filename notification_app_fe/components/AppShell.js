"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import InboxIcon from "@mui/icons-material/Inbox";
import StarRateIcon from "@mui/icons-material/StarRate";

export default function AppShell({ children }) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: "All",
      icon: <InboxIcon fontSize="small" />,
      active: pathname === "/",
    },
    {
      href: "/priority",
      label: "Priority",
      icon: <StarRateIcon fontSize="small" />,
      active: pathname === "/priority",
    },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: 68, gap: 2 }}>
            <NotificationsActiveIcon color="primary" />
            <Typography
              variant="h6"
              component="div"
              sx={{ flexGrow: 1, minWidth: 0 }}
            >
              Campus Notifications
            </Typography>
            <Stack direction="row" spacing={1}>
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  LinkComponent={Link}
                  href={item.href}
                  variant={item.active ? "contained" : "text"}
                  startIcon={item.icon}
                  size="small"
                >
                  {item.label}
                </Button>
              ))}
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>
      <Container maxWidth="lg" component="main" sx={{ py: { xs: 2, md: 3 } }}>
        {children}
      </Container>
    </Box>
  );
}
