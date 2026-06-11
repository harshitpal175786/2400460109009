"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import NotificationCard from "../../components/NotificationCard";
import NotificationToolbar from "../../components/NotificationToolbar";
import { getTopPriorityNotifications } from "../../lib/priority";
import { logFrontend } from "../../lib/logging";

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

export default function PriorityNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [viewedIds, setViewedIds] = useState(new Set());
  const [type, setType] = useState("");
  const [topN, setTopN] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredNotifications = useMemo(() => {
    return type
      ? notifications.filter((notification) => notification.Type === type)
      : notifications;
  }, [notifications, type]);

  const priorityNotifications = useMemo(() => {
    return getTopPriorityNotifications(filteredNotifications, topN);
  }, [filteredNotifications, topN]);

  async function fetchNotifications() {
    setLoading(true);
    setError("");
    await logFrontend("info", "page", "priority notifications fetch started");

    try {
      const response = await fetch("/api/notifications?limit=10&page=1", {
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
        `priority notifications source count ${(data.notifications || []).length}`
      );
    } catch (err) {
      setError(err.message);
      await logFrontend("error", "page", `priority page error ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setViewedIds(loadViewedIds());
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    logFrontend(
      "info",
      "component",
      `priority list generated top ${topN} type ${type || "all"}`
    );
  }, [topN, type]);

  function markViewed(id) {
    const next = new Set(viewedIds);
    next.add(id);
    setViewedIds(next);
    window.localStorage.setItem(VIEWED_KEY, JSON.stringify([...next]));
    logFrontend("info", "state", `priority notification marked viewed ${id}`);
  }

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4">Priority Inbox</Typography>
          <Typography variant="body2" color="text.secondary">
            Highest priority unread-style view ranked by type weight and recency.
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

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <Box sx={{ flex: 1 }}>
          <NotificationToolbar
            type={type}
            onTypeChange={setType}
            showPageSize={false}
          />
        </Box>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="top-n-label">Top N</InputLabel>
          <Select
            labelId="top-n-label"
            label="Top N"
            value={topN}
            onChange={(event) => setTopN(Number(event.target.value))}
          >
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={15}>15</MenuItem>
            <MenuItem value={20}>20</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Box sx={{ display: "grid", placeItems: "center", minHeight: 260 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {priorityNotifications.length === 0 ? (
            <Alert severity="info">No priority notifications found.</Alert>
          ) : (
            priorityNotifications.map((notification, index) => (
              <NotificationCard
                key={notification.ID}
                notification={notification}
                viewed={viewedIds.has(notification.ID)}
                onMarkViewed={markViewed}
                showPriority
                rank={index + 1}
              />
            ))
          )}
        </Stack>
      )}
    </Stack>
  );
}
