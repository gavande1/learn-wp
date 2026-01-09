# Cron / Event API

## Overview

WordPress Cron (WP-Cron) is a pseudo-cron system that allows you to schedule tasks to run at specific times or intervals. Unlike server cron jobs, WP-Cron is triggered by site visits.

## Key Concepts

### How WP-Cron Works

1. A visitor loads a page
2. WordPress checks if any scheduled tasks are due
3. Due tasks are executed
4. Process continues with page load

### WP-Cron vs System Cron

| WP-Cron | System Cron |
|---------|-------------|
| Triggered by visits | Runs regardless of traffic |
| May miss schedules on low-traffic sites | Always on time |
| Easy to set up | Requires server access |
| Can slow page loads | Runs independently |

## Scheduling Events

### One-Time Events

```php
// Schedule a one-time event
if (!wp_next_scheduled('my_onetime_event')) {
    wp_schedule_single_event(
        time() + 3600, // 1 hour from now
        'my_onetime_event',
        array('arg1', 'arg2') // Optional arguments
    );
}

// Hook to handle the event
add_action('my_onetime_event', 'handle_onetime_event', 10, 2);

function handle_onetime_event($arg1, $arg2) {
    // Process the scheduled task
    error_log("One-time event fired with: $arg1, $arg2");
}
```

### Recurring Events

```php
// Register custom schedule interval
add_filter('cron_schedules', 'add_custom_intervals');

function add_custom_intervals($schedules) {
    $schedules['five_minutes'] = array(
        'interval' => 300, // 5 minutes in seconds
        'display' => 'Every Five Minutes'
    );
    $schedules['weekly'] = array(
        'interval' => 604800,
        'display' => 'Once Weekly'
    );
    return $schedules;
}

// Schedule recurring event
if (!wp_next_scheduled('my_recurring_event')) {
    wp_schedule_event(
        time(),
        'hourly', // 'hourly', 'twicedaily', 'daily', or custom
        'my_recurring_event'
    );
}

// Handle the recurring event
add_action('my_recurring_event', 'handle_recurring_event');

function handle_recurring_event() {
    // Your recurring task
    update_option('last_cron_run', current_time('mysql'));
}
```

## Built-in Schedules

WordPress provides these default schedules:

| Name | Interval |
|------|----------|
| `hourly` | 1 hour |
| `twicedaily` | 12 hours |
| `daily` | 24 hours |
| `weekly` | 1 week (WP 5.4+) |

## Managing Scheduled Events

### Check Next Scheduled Time

```php
// Get timestamp of next scheduled run
$next = wp_next_scheduled('my_event');

if ($next) {
    echo 'Next run: ' . date('Y-m-d H:i:s', $next);
} else {
    echo 'Event not scheduled';
}
```

### Unschedule Events

```php
// Unschedule a specific instance
$timestamp = wp_next_scheduled('my_event');
if ($timestamp) {
    wp_unschedule_event($timestamp, 'my_event');
}

// Unschedule all instances of an event
wp_clear_scheduled_hook('my_event');

// Unschedule with arguments
wp_clear_scheduled_hook('my_event', array('arg1', 'arg2'));
```

### List All Scheduled Events

```php
// Get all scheduled cron events
$cron_jobs = _get_cron_array();

foreach ($cron_jobs as $timestamp => $cron) {
    foreach ($cron as $hook => $events) {
        echo "$hook scheduled for " . date('Y-m-d H:i:s', $timestamp) . "\n";
    }
}
```

## Plugin Activation/Deactivation

```php
// Schedule on activation
register_activation_hook(__FILE__, 'my_plugin_activate');

function my_plugin_activate() {
    if (!wp_next_scheduled('my_plugin_daily_task')) {
        wp_schedule_event(time(), 'daily', 'my_plugin_daily_task');
    }
}

// Unschedule on deactivation
register_deactivation_hook(__FILE__, 'my_plugin_deactivate');

function my_plugin_deactivate() {
    wp_clear_scheduled_hook('my_plugin_daily_task');
}
```

## Switching to System Cron

For high-traffic or mission-critical sites:

```php
// In wp-config.php - disable WP-Cron
define('DISABLE_WP_CRON', true);
```

Then add a system cron job:

```bash
# Run WordPress cron every minute
* * * * * cd /path/to/wordpress && php wp-cron.php > /dev/null 2>&1

# Or use WP-CLI
* * * * * cd /path/to/wordpress && wp cron event run --due-now > /dev/null 2>&1
```

## Handling Missed Events

```php
// Check for and run missed events
function run_missed_cron_events() {
    $crons = _get_cron_array();
    $current_time = time();
    
    foreach ($crons as $timestamp => $cronhooks) {
        if ($timestamp > $current_time) {
            break; // Future events, stop checking
        }
        
        foreach ($cronhooks as $hook => $events) {
            foreach ($events as $event) {
                // Event is overdue
                error_log("Running missed cron: $hook");
                do_action_ref_array($hook, $event['args']);
            }
        }
    }
}
```

## Best Practices

1. **Always check before scheduling** - Use `wp_next_scheduled()`
2. **Clean up on deactivation** - Remove scheduled events
3. **Use system cron for high-traffic sites**
4. **Keep tasks lightweight** - Long tasks block page loads
5. **Log cron execution** - For debugging and monitoring
6. **Handle duplicate events** - They can accumulate

## Common Pitfalls

- **Not checking if already scheduled** - Creates duplicate events
- **Forgetting to clean up** - Orphaned cron jobs persist
- **Long-running tasks** - Slow down page loads
- **Relying on exact timing** - WP-Cron is approximate
- **Not handling failures** - Tasks can fail silently

## Debugging

```php
// View all scheduled events
if (defined('WP_CLI') && WP_CLI) {
    // WP-CLI: wp cron event list
}

// Or in code
$crons = _get_cron_array();
echo '<pre>' . print_r($crons, true) . '</pre>';
```

## Exam Tips

- **Know the difference between WP-Cron and system cron**: WP-Cron is triggered by page visits and may miss schedules on low-traffic sites, while system cron runs independently at exact times. WP-Cron is easier to set up but less reliable. Use system cron (via `DISABLE_WP_CRON`) for high-traffic or mission-critical sites where exact timing matters.

- **Understand when to use single vs recurring events**: Use `wp_schedule_single_event()` for one-time tasks that need to run at a specific future time. Use `wp_schedule_event()` for recurring tasks that need to run at intervals. Always check with `wp_next_scheduled()` before scheduling to avoid duplicates.

- **Know how to properly schedule and unschedule events**: Always check if an event is already scheduled before adding it to prevent duplicates. Use `wp_clear_scheduled_hook()` to remove all instances of an event, or `wp_unschedule_event()` with a specific timestamp. Clean up scheduled events in your plugin's deactivation hook.

- **Understand the implications of `DISABLE_WP_CRON`**: When set to `true` in `wp-config.php`, WordPress stops checking for due cron events on page loads. You must then set up a system cron job to run `wp-cron.php` or use WP-CLI's `wp cron event run`. This improves performance but requires server access to configure.

- **Know built-in schedules and how to add custom ones**: Built-in schedules are `hourly`, `twicedaily`, `daily`, and `weekly`. Add custom intervals using the `cron_schedules` filter, providing an interval in seconds and a display name. Custom schedules can then be used in `wp_schedule_event()` just like built-in ones.
