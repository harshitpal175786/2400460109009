"use client";

import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";

export default function NotificationToolbar({
  type,
  onTypeChange,
  pageSize,
  onPageSizeChange,
  showPageSize = true,
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      alignItems={{ xs: "stretch", sm: "center" }}
      sx={{ mb: 2 }}
    >
      <ToggleButtonGroup
        value={type}
        exclusive
        onChange={(_, value) => {
          if (value !== null) {
            onTypeChange(value);
          }
        }}
        size="small"
        aria-label="notification type"
        sx={{ flexWrap: "wrap" }}
      >
        <ToggleButton value="">All</ToggleButton>
        <ToggleButton value="Placement">Placement</ToggleButton>
        <ToggleButton value="Result">Result</ToggleButton>
        <ToggleButton value="Event">Event</ToggleButton>
      </ToggleButtonGroup>

      {showPageSize ? (
        <FormControl size="small" sx={{ minWidth: 132, ml: { sm: "auto" } }}>
          <InputLabel id="page-size-label">Limit</InputLabel>
          <Select
            labelId="page-size-label"
            label="Limit"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={15}>15</MenuItem>
            <MenuItem value={20}>20</MenuItem>
          </Select>
        </FormControl>
      ) : null}
    </Stack>
  );
}
