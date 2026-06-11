"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Pagination,
  Stack,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import NotificationCard from "../components/NotificationCard";
import NotificationToolbar from "../components/NotificationToolbar";
import { logFrontend } from "../lib/logging";

const VIEWED_KEY = "campus_notification_viewed_ids";

function loadViewedIds() {
  if (typeof window === "undefined") {
    return new Set();
  }

  try {
    return new Set(JSON.parse(window.localStorage.getItem(VIEWED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export default function AllNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [viewedIds, setViewedIds] = useState(new Set());
  const [type, setType] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams({
      limit: String(pageSize),
      page: String(page),
    });
    if (type) {
      params.set("notification_type", type);
    }
    return params.toString();
  }, [page, pageSize, type]);

  async function fetchNotifications() {
    setLoading(true);
    setError("");
    await logFrontend("info", "page", "all notifications fetch started");

    try {
      const response = await fetch(`/api/notifications?${query}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to fetch notifications");
      }

      setNotifications(data.notifications || []);
      await logFrontend(
        "info",
        "page",
        `all notifications rendered count ${(data.notifications || []).length}`
      );
    } catch (err) {
      setError(err.message);
      await logFrontend("error", "page", `all notifications error ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setViewedIds(loadViewedIds());
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [query]);

  function markViewed(id) {
    const next = new Set(viewedIds);
    next.add(id);
    setViewedIds(next);
    window.localStorage.setItem(VIEWED_KEY, JSON.stringify([...next]));
    logFrontend("info", "state", `notification marked viewed ${id}`);
  }

  function handleTypeChange(nextType) {
    setType(nextType);
    setPage(1);
  }

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4">All Notifications</Typography>
          <Typography variant="body2" color="text.secondary">
            Latest campus updates with local viewed state.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchNotifications}
        >
          Refresh
        </Button>
      </Stack>

      <NotificationToolbar
        type={type}
        onTypeChange={handleTypeChange}
        pageSize={pageSize}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(1);
        }}
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Box sx={{ display: "grid", placeItems: "center", minHeight: 260 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {notifications.length === 0 ? (
            <Alert severity="info">No notifications found.</Alert>
          ) : (
            notifications.map((notification) => (
              <NotificationCard
                key={notification.ID}
                notification={notification}
                viewed={viewedIds.has(notification.ID)}
                onMarkViewed={markViewed}
              />
            ))
          )}
        </Stack>
      )}

      <Stack direction="row" justifyContent="center">
        <Pagination
          page={page}
          count={10}
          onChange={(_, value) => setPage(value)}
          color="primary"
          showFirstButton
          showLastButton
        />
      </Stack>
    </Stack>
  );
}
