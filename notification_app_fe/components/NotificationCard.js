"use client";

import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import WorkIcon from "@mui/icons-material/Work";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EventIcon from "@mui/icons-material/Event";
import { getPriorityScore } from "../lib/priority";

const TYPE_META = {
  Placement: {
    icon: <WorkIcon fontSize="small" />,
    color: "primary",
  },
  Result: {
    icon: <EmojiEventsIcon fontSize="small" />,
    color: "secondary",
  },
  Event: {
    icon: <EventIcon fontSize="small" />,
    color: "default",
  },
};

export default function NotificationCard({
  notification,
  viewed,
  onMarkViewed,
  showPriority = false,
  rank,
}) {
  const typeMeta = TYPE_META[notification.Type] || TYPE_META.Event;
  const priority = getPriorityScore(notification);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: viewed ? "background.paper" : "#eef7f5",
        borderColor: viewed ? "divider" : "primary.light",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        {rank ? (
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {rank}
          </Box>
        ) : null}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mb: 0.75, flexWrap: "wrap", rowGap: 1 }}
          >
            <Chip
              icon={typeMeta.icon}
              label={notification.Type}
              color={typeMeta.color}
              size="small"
              variant={viewed ? "outlined" : "filled"}
            />
            <Chip
              icon={
                viewed ? (
                  <MarkEmailReadIcon fontSize="small" />
                ) : (
                  <RadioButtonUncheckedIcon fontSize="small" />
                )
              }
              label={viewed ? "Viewed" : "New"}
              size="small"
              color={viewed ? "default" : "success"}
              variant={viewed ? "outlined" : "filled"}
            />
            {showPriority ? (
              <Tooltip title="Type weight followed by notification timestamp">
                <Chip
                  label={`Score ${priority.display}`}
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            ) : null}
          </Stack>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
            {notification.Message}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {notification.Timestamp}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 0.5 }}
          >
            ID: {notification.ID}
          </Typography>
        </Box>

        <Button
          variant={viewed ? "outlined" : "contained"}
          startIcon={<MarkEmailReadIcon />}
          onClick={() => onMarkViewed(notification.ID)}
          disabled={viewed}
          sx={{ alignSelf: { xs: "stretch", sm: "center" }, flexShrink: 0 }}
        >
          Mark viewed
        </Button>
      </Stack>
    </Paper>
  );
}
