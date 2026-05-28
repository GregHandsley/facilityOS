FacilityOS Development Plan
Product Name

FacilityOS

Tagline

Give every piece of equipment a memory.

Product Summary

FacilityOS is a premium, mobile-first equipment care and facility operations platform for gyms, sports facilities, performance centres and similar environments.

The app gives every room, area and piece of equipment a digital identity through a QR code. Public users can scan a QR code to view the equipment status and report a fault. Staff can complete cleaning, maintenance and inspection tasks, mark equipment out of order and submit evidence. Managers can oversee standards, configure care plans, review issues, complete spot checks, manage users, monitor replacement intelligence and view AI insights.

The app should feel like a premium social media or sports-tech product, not traditional facilities management software. It should use card-based layouts, dark-mode-first styling, equipment imagery, status rings, live activity feeds and intelligent insight cards.

The core idea:

Every piece of equipment gets a care plan, a live status, a memory and an AI assistant watching for patterns humans miss.

Recommended Tech Stack

Use:

Framework: Next.js
Frontend: React
Language: TypeScript
Styling: Tailwind CSS
UI Components: shadcn/ui
Authentication: Firebase Auth
Database: Firebase Firestore
Storage: Firebase Storage
Hosting: Vercel
Email: Resend
AI Layer: OpenAI API or equivalent
QR Codes: qrcode npm package
Forms: React Hook Form
Validation: Zod
Dates: date-fns
Testing: Vitest, React Testing Library, Playwright
Formatting: ESLint and Prettier
Core Development Rule

FacilityOS must not treat authentication as the same thing as authorisation.

RBAC must be implemented from the beginning and enforced at every layer:

Route level
Component/UI level
Server/API action level
Firestore security rules level
Data query level
Cross-facility access level

Staff should not be able to access manager functionality by typing a URL, calling an API action directly, editing client-side code or querying Firestore manually.

User Roles
1. Public User

Unauthenticated QR user.

Can:

scan QR codes
view public equipment status
view public equipment image
view approved public care information
submit fault reports

Cannot:

log into staff areas
complete tasks
see staff names
see internal notes
see failed spot checks
see manager comments
see replacement intelligence
see AI internal insights
see restricted equipment history
2. Staff User

Logged-in operational team member.

Can:

view assigned tasks
complete cleaning tasks
complete maintenance tasks
complete inspection tasks
upload evidence
add notes
report internal faults
mark equipment out of order
view relevant equipment history
view staff-level equipment pages

Cannot:

manage users
edit facility settings
create or delete facilities
create or delete equipment unless explicitly allowed later
configure care plan templates
change public visibility settings
approve their own spot checks
view sensitive manager-only insights
dismiss replacement intelligence
access another facility’s data
3. Manager User

Logged-in facility manager/admin.

Can:

manage facility settings
manage locations
manage equipment
manage users
create care plans
create task templates
configure evidence levels
configure public visibility
view all issues
manage issue status
return equipment to service
review spot checks
approve or reject work
view replacement intelligence
acknowledge or dismiss AI insights
export QR codes
view full equipment history

Cannot:

access another facility’s data unless assigned to it
bypass audit history
silently delete critical operational records without trace
Permission Matrix
Feature	Public	Staff	Manager
View public QR page	Yes	Yes	Yes
Report public fault	Yes	Yes	Yes
Login	No	Yes	Yes
View staff tasks	No	Yes	Yes
Complete care tasks	No	Yes	Yes
Upload task evidence	No	Yes	Yes
Mark equipment out of order	No	Yes	Yes
Return equipment to service	No	No by default	Yes
View manager Pulse	No	No	Yes
Manage issues	No	Limited/internal only	Yes
Manage equipment setup	No	No	Yes
Manage locations	No	No	Yes
Manage users	No	No	Yes
Configure care plans	No	No	Yes
Configure visibility settings	No	No	Yes
Review spot checks	No	No	Yes
Approve own work	No	No	No
View AI insights	No	Limited if relevant	Yes
View replacement intelligence	No	No	Yes
Suggested Folder Structure
/app
  /(public)
    /public/equipment/[slug]
    /public/equipment/[slug]/report

  /(auth)
    /login

  /(app)
    /app/today
    /app/pulse
    /app/tasks
    /app/tasks/[taskId]
    /app/equipment
    /app/equipment/[equipmentId]
    /app/equipment/[equipmentId]/out-of-order
    /app/issues
    /app/issues/[issueId]
    /app/spot-checks
    /app/insights
    /app/settings
    /app/settings/facility
    /app/settings/locations
    /app/settings/users
    /app/settings/qr

/components
  /ui
  /layout
  /cards
  /equipment
  /tasks
  /issues
  /status
  /forms
  /insights
  /rbac

/lib
  /firebase
  /auth
  /rbac
  /db
  /storage
  /status
  /ai
  /qr
  /dates
  /notifications
  /spot-checks
  /replacement-intelligence

/types
/tests
RBAC Utilities Required

Create these early:

/lib/rbac/roles.ts
/lib/rbac/permissions.ts
/lib/rbac/guards.ts
/lib/rbac/can.ts
/components/rbac/RequireRole.tsx
/components/rbac/RequirePermission.tsx

Example permissions:

type Permission =
  | "view_public_equipment"
  | "report_fault"
  | "view_staff_tasks"
  | "complete_task"
  | "mark_out_of_order"
  | "return_to_service"
  | "view_manager_pulse"
  | "manage_equipment"
  | "manage_locations"
  | "manage_users"
  | "manage_care_plans"
  | "manage_issues"
  | "review_spot_checks"
  | "view_ai_insights"
  | "view_replacement_intelligence"
  | "manage_public_visibility";
Sprint 0: Project Foundation
Goal

Create the base Next.js application, styling system, Firebase setup and design foundation.

Build
Next.js app router project
TypeScript
Tailwind CSS
shadcn/ui
Firebase config
Vercel-ready deployment
ESLint and Prettier
base dark-mode-first design system
reusable layout components
reusable status components
Create
AppShell
PageHeader
StatusBadge
StatusRing
EmptyState
LoadingCard
PremiumCard
ActivityFeedCard
Testing Criteria
App runs locally
App builds successfully
Tailwind works
shadcn/ui works
Firebase config loads safely
Vercel deployment works
Base UI components render correctly
Codex Prompt
Build Sprint 0 for FacilityOS.

Create a Next.js TypeScript app using the app router, Tailwind CSS and shadcn/ui. Add Firebase client setup, environment variable placeholders, Vercel deployment readiness, dark-mode-first global styling and reusable base components.

The UI should feel like a premium sports-tech/social app, not an admin dashboard.

Do not build business features yet.
Sprint 1: Authentication, Users and RBAC Foundation
Goal

Implement Firebase Auth, user profiles and the first version of RBAC.

Build
Firebase Auth login/logout
protected app routes
current user provider
Firestore users collection
role model: staff, manager
permission mapping
route guards
component guards
server/action permission helpers
staff redirect to /app/today
manager redirect to /app/pulse
User Model
type UserRole = "staff" | "manager";

type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  facilityId: string;
  createdAt: string;
  lastLoginAt?: string;
};
Testing Criteria
User can log in
User can log out
Logged-out users cannot access /app/*
Staff users land on /app/today
Manager users land on /app/pulse
Staff cannot access manager-only routes
Manager can access manager routes
Route guard works
Component guard works
Permission helper works
Auth loading state works
Auth errors are shown cleanly
Codex Prompt
Build Sprint 1 for FacilityOS.

Implement Firebase Auth, user profiles and RBAC foundation. Create staff and manager roles, permission mappings, route guards, component guards and helper functions for checking permissions.

Staff should be redirected to /app/today. Managers should be redirected to /app/pulse.

RBAC must be treated as a core architecture layer, not just UI hiding.

Add tests for login, logout, protected routes and permission checks.
Sprint 1B: RBAC Hardening and Security Rules
Goal

Make sure permissions are enforced beyond the UI.

Build
Firestore security rules for users
Firestore security rules for facility-level data
helper to ensure user belongs to facility
server-side permission checks for protected actions
test users for staff and manager
cross-facility access prevention
public access rules for QR pages only
restrict sensitive fields from public reads
Rules Required

Public users can only read approved public equipment data and create public fault reports.

Staff can read facility equipment and tasks within their assigned facility.

Staff can write task completion records and out-of-order events.

Managers can manage facility data within their assigned facility.

No authenticated user can access another facility’s private data.

Testing Criteria
Staff cannot access manager-only Firestore writes
Staff cannot edit facility settings
Staff cannot manage users
Staff cannot approve their own spot checks
Public users cannot read internal equipment data
Public users cannot read staff names
Public users cannot read AI insights
Public users cannot read replacement intelligence
User from Facility A cannot access Facility B data
Server actions reject unauthorised requests
UI hiding is not the only security layer
Codex Prompt
Build Sprint 1B for FacilityOS.

Harden RBAC. Add Firestore security rules and server-side permission checks so users can only access data for their own facility and role.

Public users should only access public QR equipment data and submit fault reports. Staff should only complete operational tasks and mark equipment out of order. Managers should manage facility configuration and review work.

Add tests for cross-facility access, staff attempting manager actions, public attempting private reads and server action permission rejection.
Sprint 2: Facilities and Locations
Goal

Create the facility and location hierarchy.

Build

Collections:

facilities
locations

Managers can:

create/edit facility
set facility name
set logo
set brand colour
create locations
create nested locations
archive locations

Location types:

facility
zone
room
area

Future location terminology review:

The location type dropdown may be confusing, especially the difference between zone and area.

Before expanding location management further, review whether FacilityOS really needs both terms or whether the hierarchy should use simpler language.

Possible options:

facility
room
area

or:

facility
zone
room

The final terminology should match how gym and sports facility teams naturally speak. If users cannot clearly explain the difference between a zone and an area, the product should avoid asking them to choose between both.

Routes:

/app/settings/facility
/app/settings/locations
RBAC Requirements
Managers can create/edit facilities and locations
Staff can read location names for their facility
Staff cannot create/edit/archive locations
Public users cannot access internal location management
Cross-facility access is blocked
Testing Criteria
Manager can create facility
Manager can edit facility
Manager can create location
Manager can nest locations
Staff can view location labels
Staff cannot manage locations
Public cannot access settings
Archived locations are hidden from active lists
Sprint 3: Equipment Profiles and Images
Goal

Create equipment records with image-led profile pages.

Build

Collection:

equipment

Managers can:

create equipment
assign equipment to location
add manufacturer
add model
add equipment type
add equipment number
add description
upload image
edit equipment
archive equipment

Routes:

/app/equipment
/app/equipment/new
/app/equipment/[equipmentId]
RBAC Requirements
Managers can create/edit/archive equipment
Staff can view equipment
Staff cannot edit equipment setup
Public can only view approved public equipment fields through QR page
Public cannot read full equipment records
Testing Criteria
Manager can create equipment
Equipment has unique public QR slug
Equipment image uploads
Equipment detail renders
Staff can view equipment
Staff cannot edit equipment
Archived equipment is hidden
Public cannot access internal equipment detail page
Sprint 4: Public QR Equipment Status Page
Goal

Create the no-login QR page.

Build

Route:

/public/equipment/[slug]

Displays:

equipment image
equipment name
manufacturer/model if public
location
traffic light status
status copy
last cleaned
last maintained
last inspected
active fault state
report fault button
RBAC Requirements
No login required
Only approved public fields are exposed
No staff names
No manager notes
No replacement intelligence
No AI internal insights
No failed spot checks
Testing Criteria
Public QR page loads without login
Valid slug loads correct equipment
Invalid slug shows clean not-found state
Public page shows correct status
Public page hides internal data
Report fault button works
Sprint 5: Public Fault Reporting
Goal

Allow public users to report faults without logging in.

Build

Route:

/public/equipment/[slug]/report

Collection:

issues

Fields:

category
description
optional photo
optional contact email
reporter type: public
status: new
linked equipment
linked facility
linked location

Categories:

equipment_fault
cleaning_issue
safety_concern
stock_issue
building_issue
other
RBAC Requirements
Public can create issue only through public report route
Public cannot set privileged fields
Public cannot assign priority beyond default
Public cannot read issue management data
Staff and managers can see reports for their facility
Testing Criteria
Public can submit fault
Issue is created
Issue links to equipment
Photo upload works
Empty description is blocked
Public cannot manipulate restricted fields
Manager can see issue
Public page updates active fault state
Sprint 6: Manager Issue Management
Goal

Allow managers to manage reported issues.

Build

Routes:

/app/issues
/app/issues/[issueId]

Managers can:

view issues
filter issues
change status
assign issue
change priority
add internal notes
resolve issue
close issue

Statuses:

new
acknowledged
assigned
in_progress
waiting
resolved
closed

Priorities:

low
medium
high
critical
RBAC Requirements
Managers can manage issues
Staff can view assigned/internal issues if permitted
Staff cannot close manager-level issues unless allowed
Public cannot access issue management
Cross-facility issue access is blocked
Testing Criteria
Manager can update issue status
Manager can update priority
Manager can resolve issue
Staff cannot access manager issue page by URL
Resolved issues no longer show as active faults
Public cannot view issue detail
Sprint 7: Care Task Schedules and Staff Task Dashboard
Goal

Create recurring care tasks and a staff working dashboard.

Build

Collections:

careTaskSchedules
careTaskInstances

Routes:

/app/tasks
/app/tasks/[taskId]

Task categories:

cleaning
maintenance
inspection
compliance
safety

Task statuses:

pending
in_progress
completed
overdue
skipped
RBAC Requirements
Managers create and edit care schedules
Staff view assigned task instances
Staff complete task instances
Staff cannot edit recurring schedule setup
Public cannot view tasks
Testing Criteria
Manager creates care schedule
Task appears for staff
Staff completes task
Completion is recorded
Staff cannot edit schedule
Public cannot access tasks
Completed task updates equipment care history
Sprint 8: Evidence Levels
Goal

Add tiered proof for task completion.

Build

Evidence levels:

Quick confirmation
Area/checklist confirmation
QR confirmation
Photo and note evidence
RBAC Requirements
Staff can submit required evidence
Managers can view evidence
Managers configure evidence level
Staff cannot lower evidence requirement
Public cannot view task evidence
Testing Criteria
Level 1 completes with simple confirmation
Level 2 requires checklist
Level 3 requires QR/equipment confirmation
Level 4 requires note/photo
Staff cannot bypass required evidence
Manager can view evidence
Sprint 9: Staff Out-of-Order Mode
Goal

Allow staff to mark equipment out of order.

Build

Route:

/app/equipment/[equipmentId]/out-of-order

Future QR-first staff route:

/public/equipment/[slug] with authenticated staff actions

Collection:

outOfOrderEvents

Staff can submit:

reason
severity
photo
unsafe/unavailable toggle
note

Staff QR flow:

staff scans equipment QR code
app recognises authenticated staff user
public QR page shows staff-only actions
staff can choose Mark out of order from the QR page
equipment identity is pre-filled from the scanned QR code
staff cannot mark a different item out of order from that scanned context
public users never see staff actions
managers may see manager actions from the same QR context

When submitted:

equipment turns red
isOutOfOrder becomes true
downtime timer starts
linked issue is created
public QR page updates
manager is notified
RBAC Requirements
Staff can mark equipment out of order
Staff can mark equipment out of order from a scanned QR code once staff QR actions are implemented
Managers can also mark equipment out of order
Managers can return equipment to service
Staff cannot return equipment to service by default
Public cannot mark equipment out of order
Public users cannot see or trigger staff QR actions
Testing Criteria
Staff can mark out of order
Logged-in staff scanning a QR code can access Mark out of order for that exact equipment
Unauthenticated public users scanning the same QR code cannot see staff actions
Equipment status becomes red
Public page updates
Issue is created
Downtime starts
Manager can return equipment to service
Staff cannot return equipment to service unless granted permission
Sprint 10: Manager Pulse
Goal

Create the premium manager home screen.

Build

Route:

/app/pulse

Sections:

Facility Pulse
Needs Your Attention
Live Activity
Open Issues
Out-of-Order Equipment
Overdue Tasks
Equipment at Risk
Spot Check Placeholder
Equipment Health Review Placeholder
AI Insight Placeholder
RBAC Requirements
Managers can access Pulse
Staff cannot access Pulse
Public cannot access Pulse
Pulse only shows data for manager’s facility
Testing Criteria
Manager sees correct counts
Staff cannot access Pulse
Cross-facility data does not appear
Out-of-order equipment appears
Open issues appear
Overdue tasks appear
Mobile UI works
Sprint 11: Activity Feed
Goal

Make the app feel alive with a social-style operational feed.

Build

Collection:

activityFeedItems

Create feed items for:

equipment created
task completed
fault reported
issue status changed
equipment marked out of order
equipment returned to service
spot check completed
AI insight created

Display on:

Pulse
Equipment Detail
Staff Today
RBAC Requirements
Staff can see relevant operational feed items
Managers can see full facility feed
Public cannot see internal feed
Sensitive feed items are manager-only
Testing Criteria
Feed item created on task completion
Feed item created on fault report
Feed item created on out-of-order event
Staff sees permitted feed
Manager sees full feed
Public cannot read feed
Sprint 12: Manager Spot Checks
Goal

Add random manager assurance checks.

Build

Collection:

spotChecks

Route:

/app/spot-checks

Spot check statuses:

pending
passed
failed
recheck_required
escalated

Simple sampling logic:

default 10% sample rate
always sample Level 4 tasks
higher chance for overdue completed tasks
RBAC Requirements
Managers review spot checks
Staff can view their own pending rechecks if relevant
Staff cannot approve or pass their own work
Public cannot view spot checks
Testing Criteria
Completed tasks can generate spot checks
Manager can pass spot check
Manager can fail spot check
Staff cannot approve own work
Failed spot check appears in Pulse
Public cannot read spot check data
Added after Sprint 12: Failed Spot Check Rework Loop
Reason

This scope was added after Sprint 12 because the original spot-check plan defined failed, recheck-required and escalated statuses but did not define the operational follow-up for staff. Since Sprint 13 has already been completed, this is documented as a post-Sprint 12 addition rather than a rewrite of the adaptive sampling sprint.

Build

When a manager reviews a spot check as failed or recheck_required:

create a corrective staff task linked to the original task and spot check
use the manager note as the rework instruction
assign the corrective task to the staff member who completed the original work
show the corrective task in the staff Today view
keep the spot check open until the corrective task is completed and reviewed

When a manager marks a spot check as escalated:

do not assign the staff member to self-resolve by default
surface the escalation in Pulse for manager follow-up
allow managers to decide whether to create a corrective task, issue or out-of-order event

Staff workflow:

staff can view their own recheck-required work
staff can complete the corrective task with required evidence
staff cannot pass, approve or close their own spot check
completing corrective work can generate a new manager review

Manager workflow:

manager can pass the rework review
manager can fail the rework again
manager can escalate repeated failures
manager can see the original task, failed spot check, corrective task and rework evidence together

RBAC Requirements

Staff can only see recheck/corrective work assigned to themselves
Staff cannot see other staff members' failed spot checks
Staff cannot edit manager notes or review outcomes
Managers can view all failed, recheck-required and escalated spot checks for their facility
Public users cannot view failed checks, rework tasks or manager notes

Testing Criteria

Failed spot check creates a corrective staff task
Recheck-required spot check appears in the staff member's Today view
Staff completing corrective work does not close the spot check automatically
Manager can review corrective work and pass it
Repeated failed rework can be escalated
Staff cannot approve their own rework
Public cannot read failed spot check or rework data
Sprint 13: Adaptive Sampling Logic
Goal

Increase or reduce spot-check sample size based on standards.

Build

Confidence statuses:

green
amber
red

Sampling bands:

green: 5–10%
amber: 20–30%
red: 40–60%

Confidence calculated by:

facility
location
staff member
task category
RBAC Requirements
Managers can view confidence status
Staff may see simplified feedback if appropriate
Public cannot see confidence status
Staff cannot alter sampling rates
Testing Criteria
Failed check increases sampling rate
Passed checks reduce sampling rate over time
Confidence changes from green to amber/red
Staff cannot modify sampling state
Manager sees sampling explanation
Sprint 14: Equipment Status Engine
Goal

Centralise traffic light status logic.

Build

Create:

/lib/status/equipmentStatus.ts

Red if:

out of order
active critical issue
unresolved safety issue
failed critical spot check
critical task overdue

Amber if:

maintenance due soon
minor issue active
task overdue
repeat fault emerging
spot check pending
replacement status is watch

Green if:

no active issues
care tasks in date
no failed checks
no replacement warning
not out of order
RBAC Requirements
Status is calculated server-side or trusted backend-side
Staff cannot manually force green status
Public only sees final public-safe status
Manager sees status reasoning
Testing Criteria
Out-of-order always red
Critical issue makes red
Minor issue makes amber
Resolved issue allows green if no other concerns
Staff cannot manipulate status
Public and internal views are consistent
Sprint 15: Equipment Health and Replacement Intelligence v1
Goal

Use equipment health to flag equipment that needs manager review.

Build

Create:

/lib/replacement-intelligence

Signals:

fault frequency
repeat faults
out-of-order events
total downtime
failed inspections
failed spot checks
issue severity
issues returning after resolution
clean-service recovery after repair or return-to-service

Statuses:

none
watch
review_recommended
high_priority_review

Health bands:

80-100: no review
60-79: watch
35-59: review recommended
under 35: high priority review

No monetary values in MVP.

RBAC Requirements
Managers can view replacement intelligence
Managers can acknowledge/dismiss
Staff cannot view full replacement intelligence
Public cannot view replacement intelligence
Staff cannot dismiss recommendations
Testing Criteria
Healthy equipment = none
Declining equipment health = watch
Poor equipment health = review recommended
Very poor equipment health = high priority review
Manager can acknowledge/dismiss
Public cannot access this data

Added after Sprint 15: Health-Led Pulse Review Refinement
Reason

This scope was added after the original Sprint 15 plan because the first replacement-intelligence model was too focused on a separate review/risk score. In product use, it was clearer for managers if Pulse simply flags equipment with low or declining health, then sends them to the equipment detail page to investigate the underlying signals.

The original plan still provides the source signals, but the user-facing model is now equipment health first rather than replacement score first.

Changes made

Equipment health is now the main source of truth for Pulse review flags.

Pulse shows equipment health percentage and prioritises the lowest-health equipment.

The equipment detail page includes a compact Pulse review tile in the equipment details grid.

Managers can expand the Pulse review tile to see the underlying signals, including dropdowns for the individual fault reports, out-of-order events, downtime records, failed spot checks and missed inspection/safety tasks.

Health regenerates after repair, return-to-service or completed maintenance:

repair gives a modest immediate health bump
remaining lost health regenerates over a clean-service period
new issues during recovery reduce health from the current level
older resolved/repaired clusters stop driving current health once clean service has been established

Single incidents are not treated as automatic replacement signals:

a quick one-off out-of-order event may lower health slightly
a single safety/out-of-order incident should not trigger replacement review by itself
non-reliability issues, such as cleaning issues, do not reduce equipment replacement health
repeated reliability, downtime, failed checks and safety patterns still reduce health meaningfully

Dismissed flags remain visible as a compact historical marker on the equipment detail page rather than disappearing completely.

What was removed or changed from the original plan

Removed the manager-facing separate review/risk score.

Removed the idea that replacement review is primarily a standalone score beside equipment health.

Removed lifetime-only accumulation as the main trigger; old repaired events now recover over time.

Removed harsh double-counting where a single incident could appear as both a fault signal and a safety/out-of-order replacement signal.

Changed Pulse "Equipment at Risk" from a raw replacement-score list into a health-led review list.

Kept the internal signal points only as calculation detail for health and investigation, not as the manager-facing decision metric.
Sprint 16: AI Fault Analysis
Goal

Add practical AI to analyse new fault reports.

Build

When a fault is submitted, AI suggests:

category
priority
safety-related flag
affected component
summary
recommended action
duplicate/repeat possibility

AI fields stored on issue:

aiCategory
aiPriority
aiSummary
aiRecommendedAction
isSafetyRelated

If AI fails, the issue still gets created.

RBAC Requirements
Managers can view AI analysis
Staff may view simplified AI action suggestion
Public cannot view internal AI analysis
AI cannot automatically take irreversible action
AI cannot override manager permissions
Testing Criteria
Issue is created if AI fails
AI output is validated
Manager sees AI summary
Public does not see AI summary
AI cannot auto-close issue
AI cannot bypass RBAC
Sprint 17: AI Equipment Summary and Insights
Goal

Add AI-generated equipment and facility insights.

Build

Collection:

aiInsights

Insight types:

summary
repeat_fault
replacement_review
priority_warning
spot_check_warning
weekly_summary

Route:

/app/insights
RBAC Requirements
Managers can view all insights
Staff can only view relevant operational suggestions if permitted
Public cannot view insights
Managers can acknowledge/dismiss insights
Staff cannot dismiss manager insights
Testing Criteria
AI insight is created
Manager can view insight
Manager can acknowledge insight
Manager can dismiss insight
Staff cannot access manager insight page
Public cannot access insight data
Sprint 18: Task Templates and AI Care Plan Suggestions
Goal

Speed up equipment onboarding.

Build

Templates:

treadmill
cable machine
bench
squat rack
platform
dumbbell area
rowing machine
assault bike
punch bag frame
changing room
studio

Managers can:

apply template
edit tasks before saving
use AI to suggest care plan
RBAC Requirements
Managers create/apply templates
Staff cannot create templates
Staff cannot apply templates to equipment
Public cannot access templates
Testing Criteria
Manager applies template
Template creates schedules
Manager can edit before saving
Staff cannot apply template
AI failure does not block manual setup
Sprint 19: QR Code Generation and Label Export
Goal

Allow managers to generate QR codes.

Build

Route:

/app/settings/qr

Managers can:

generate QR code
download QR PNG
batch export labels
copy public URL

Staff QR actions:

authenticated staff scanning an equipment QR code see staff-only actions
staff can open the internal equipment profile from the QR page
staff can mark the scanned equipment out of order from the QR page
staff can complete relevant QR-confirmation tasks from the QR context where applicable
staff QR actions must be hidden from unauthenticated public users
staff QR actions must respect facility membership and RBAC
RBAC Requirements
Managers can generate QR labels
Staff can view public QR URL if needed
Staff cannot bulk export by default
Public cannot generate QR codes
Public users cannot access staff QR actions
Staff cannot use a QR code from another facility to access internal actions
Testing Criteria
QR points to correct public page
Manager can download QR
Manager can batch export
Archived equipment excluded by default
Public URL works
Logged-in staff scan opens the QR page with staff actions
Staff can mark the scanned item out of order from the QR page
Public users only see the public status and public fault report flow
Sprint 20: Notifications
Goal

Notify managers about important events.

Build

Use Resend.

Notify managers when:

safety issue reported
equipment marked out of order
critical issue created
critical task overdue
spot check fails
replacement review recommended
RBAC Requirements
Only authorised managers receive manager notifications
Staff only receive assigned task notifications if added later
Public users do not receive internal notifications
Notification records respect facility boundaries
Testing Criteria
Manager receives out-of-order notification
Manager receives safety issue notification
Failed email does not break workflow
Duplicate notification not sent repeatedly
Staff do not receive manager-only emails
Sprint 21: Public Visibility Settings
Goal

Control what public users can see.

Build

Managers configure whether public page shows:

last cleaned
last maintained
last inspected
recent care
active fault status
out-of-order message
manufacturer/model
equipment image

Never public:

staff names
failed spot checks
internal notes
replacement intelligence
AI insights
contractor notes
cost data
RBAC Requirements
Managers can configure visibility
Staff cannot configure visibility
Public page respects visibility settings
Sensitive data never exposed
Testing Criteria
Manager can change visibility
Public page updates accordingly
Staff cannot change visibility
Hidden fields are not rendered
Sensitive fields are never public
Sprint 22: CSV Equipment Import
Goal

Make onboarding faster.

Build

Managers can upload CSV with:

name
manufacturer
model
equipment type
equipment number
location
description

Flow:

Upload CSV
Preview rows
Validate errors
Confirm import
Create equipment
Generate QR slugs
RBAC Requirements
Managers can import
Staff cannot import
Public cannot import
Imported equipment must belong to manager’s facility only
Testing Criteria
Valid CSV imports equipment
Invalid rows show errors
Duplicate names warned
Import can be cancelled
Staff cannot import
Cross-facility creation blocked
Sprint 23: Weekly AI Manager Summary
Goal

Generate weekly operational summaries.

Build

Summary includes:

tasks completed
overdue tasks
faults reported
faults resolved
out-of-order events
spot checks passed/failed
replacement candidates
key AI observations

Save as AI insight.

Optional email to manager.

RBAC Requirements
Managers can view weekly summary
Staff cannot view full manager summary
Public cannot view summary
Summary only includes manager’s facility
Testing Criteria
Summary generates correct counts
AI summary saved
Manager can acknowledge
Staff cannot access
Email optional and non-blocking
Sprint 24: Final RBAC Audit, QA and MVP Release
Goal

Prepare MVP for pilot release.

Build
full RBAC audit
Firestore security rules review
route protection review
server action permission review
public data exposure review
cross-facility access testing
responsive UI polish
loading states
empty states
error states
seed demo data
Vercel deployment
pilot checklist
Must-Test End-to-End Flows
Public scans QR and reports fault.
Public cannot see internal information.
Staff logs in and completes task.
Staff marks equipment out of order.
Staff cannot access manager Pulse.
Staff cannot edit facility settings.
Staff cannot approve own spot check.
Manager reviews issue.
Manager returns equipment to service.
Manager completes spot check.
Manager sees replacement intelligence.
Manager sees AI insights.
User from Facility A cannot access Facility B data.
AI failure does not break issue creation.
Equipment status updates correctly across public and internal views.
Testing Criteria
All tests pass
App builds successfully
Firestore rules pass security tests
Public routes expose no sensitive data
Staff routes block manager actions
Manager routes work correctly
Cross-facility access is blocked
Mobile UI works smoothly
Demo data works
Pilot can be completed in under 10 minutes
Minimum True MVP

To move quickly, build these first:

Sprint 0: Project Foundation
Sprint 1: Authentication, Users and RBAC Foundation
Sprint 1B: RBAC Hardening and Security Rules
Sprint 2: Facilities and Locations
Sprint 3: Equipment Profiles and Images
Sprint 4: Public QR Equipment Status Page
Sprint 5: Public Fault Reporting
Sprint 6: Manager Issue Management
Sprint 7: Care Task Schedules and Staff Task Dashboard
Sprint 9: Staff Out-of-Order Mode
Sprint 10: Manager Pulse
Sprint 14: Equipment Status Engine

That gives you the first proper pilot.

Then add the “wow” features:

Sprint 12: Manager Spot Checks
Sprint 13: Adaptive Sampling Logic
Sprint 15: Replacement Intelligence
Sprint 16: AI Fault Analysis
Sprint 17: AI Equipment Summary and Insights
Future Development / Nice-to-Have List

Invite-Only Access and Controlled User Onboarding

FacilityOS should move towards an invite-only access model for staff and manager accounts.

This means users should not be able to freely create accounts and enter the internal app just because they know the login URL. Instead, managers or authorised admins should invite users into a specific facility and assign their role before that user can access protected areas.

This approach is more appropriate for FacilityOS because access is operational and facility-specific. It helps prevent malicious sign-ups, accidental access, incorrect role assignment and cross-facility data exposure.

Future build:

manager/admin invite flow
invite email sent to staff or manager
invite token linked to facilityId and intended role
invite expiry
accepted invite creates or activates the user profile
uninvited accounts cannot access internal app routes
email verification required before invite acceptance completes
Google sign-in can still be allowed, but only if the signed-in email matches a valid invite
managers can revoke pending invites
managers can deactivate users
audit trail for invite creation, acceptance, revocation and role changes

RBAC requirements:

Public users remain unauthenticated QR users
Only invited users can become staff or managers
Managers can only invite users into their own facility
Only authorised admins/managers can assign roles
Users cannot self-select staff or manager roles
Users cannot access internal routes until their invite is accepted and profile is active
Firestore rules must reject internal reads and writes from authenticated users without an active invited profile

Testing criteria:

Uninvited email/password account cannot access /app routes
Uninvited Google account cannot access /app routes
Invited staff user lands on /app/today
Invited manager lands on /app/pulse
Expired invite cannot be used
Revoked invite cannot be used
User cannot change their own role during onboarding
Manager cannot invite users into another facility
Deactivated user loses access immediately

Organisation, Site and Admin Role Model

FacilityOS should eventually support organisations above individual facilities.

This is important because some customers will operate more than one facility. For example, Loughborough University may have Powerbase Gym and Holywell Gym. David Lloyd may have multiple locations such as Lincoln, Nottingham and other clubs.

The long-term structure should become:

Organisation
Site / facility
Location
Equipment

Examples:

Loughborough University
Powerbase Gym
Holywell Gym

David Lloyd
Lincoln
Nottingham

This should introduce an admin role above facility manager.

Role model:

Public user: unauthenticated QR user
Staff user: works within assigned facility or facilities
Manager user: manages one facility by default
Admin user: manages an organisation and can oversee multiple facilities within that organisation
Super user: FacilityOS platform-level user who can create organisations and support the whole platform

Admin users may be:

organisation admin
regional admin

Super users should be separate from customer admins.

Super user role:

create organisations
create or assign organisation admins
view and support organisations when needed
configure platform-level settings
resolve account/access problems
manage billing/subscription links if added later

Super users should not be part of normal customer workflows. They are internal FacilityOS operators and should be tightly controlled.

Organisation admin role:

manage one organisation
create sites/facilities within that organisation
invite managers and staff
assign users to one or more facilities
view organisation-level reporting
manage organisation settings

Future build:

organisations collection
organisationId added to facilities
facility membership model for users
support users assigned to one or more facilities
admin dashboard across all organisation facilities
organisation-level user invitations
organisation-level reporting
cross-facility comparisons
facility switcher for authorised users
organisation settings
site/facility creation under an organisation
admin-managed role assignment
super-user organisation creation
super-user platform console
auditLogs collection for critical actions
audit log viewer for authorised admins

RBAC requirements:

Staff can only access facilities they are assigned to
Managers can manage only their assigned facility unless explicitly granted more access
Organisation admins can manage users and facilities within their organisation
Organisation admins can create sites/facilities only within their own organisation
Organisation admins cannot create new organisations
Organisation admins cannot access another organisation
Super users can create organisations and manage organisation admins
Super users should be tightly restricted and audited
All queries must be scoped by organisationId and facility access
Cross-organisation access must be blocked at Firestore rules level

Audit log requirements:

create an auditLogs collection
record actorId, actorRole, organisationId, facilityId, action, targetType, targetId, timestamp and summary
log organisation creation
log facility/site creation
log user invitations
log role changes
log user deactivation/reactivation
log permission changes
log super-user access to customer organisations
log critical deletes or archive actions
audit logs should be append-only
normal users cannot edit or delete audit logs
organisation admins can view logs for their organisation
super users can view platform-level logs
public users cannot access audit logs

Testing criteria:

Super user can create an organisation
Super user can assign an organisation admin
Organisation admin cannot create another organisation
Admin can create a facility under their organisation
Admin can invite users into a specific facility
Admin can view multiple facilities in one organisation
Manager cannot access another facility unless assigned
Staff cannot access another facility unless assigned
Organisation A admin cannot access Organisation B data
Facility switcher only shows authorised facilities
Public QR pages remain unauthenticated and facility-specific
Critical admin and super-user actions create audit log entries
Audit logs cannot be edited or deleted

Manager Task Deletion and Bulk Task Creation

Managers should eventually be able to remove or archive care tasks and schedules, but this should be controlled rather than allowing silent deletion of operational history.

FacilityOS should also support creating the same task across multiple machines at once. Some checks are naturally completed as a group, such as checking safety features, emergency stops, cables, handles, belts or general cleanliness across all equipment in an area. Managers should not need to write the same task individually for each machine.

Future build:

manager archive/delete action for care task schedules
manager archive/delete action for pending task instances
soft-delete or archive by default rather than hard delete
deletion reason required for schedules or generated tasks
deleted/archived tasks hidden from active staff dashboards
completed task history retained for audit and equipment memory
bulk task creation across selected equipment
bulk task creation by equipment type
bulk task creation by location/area
apply one checklist to many machines
create grouped care rounds for related equipment
support task templates that can be applied to multiple machines at once
option to create one group task with multiple equipment confirmations
option to create separate task instances per machine from one setup flow

Examples:

Weekly treadmill safety check across all treadmills
Cable attachment inspection across all cable machines
Emergency stop check across all cardio machines
Platform surface inspection across all lifting platforms
Changing room cleanliness round across all relevant areas

RBAC requirements:

Managers can archive/delete schedules within their facility
Managers can bulk-create tasks within their facility
Staff cannot delete care schedules
Staff cannot bulk-create task schedules unless explicitly granted later
Public users cannot access task deletion or bulk creation
Deleted/archived task actions must be logged
Cross-facility bulk creation must be blocked

Testing criteria:

Manager can archive a pending task schedule
Archived schedule no longer generates active tasks
Completed historical tasks remain visible in equipment history
Manager must provide a reason when archiving/deleting important tasks
Bulk task creation can select multiple machines
Bulk task creation can select equipment by type
Bulk task creation can select equipment by location
Staff dashboard shows the generated tasks correctly
Staff cannot delete or bulk-create tasks
Audit log is created for task deletion/archive

Equipment Health Boosts and Service Log

Equipment health should eventually improve from positive care events, not only recover from faults. The health model should recognise that a machine which is serviced, maintained, cleaned and inspected well is healthier than a machine that simply has no reported faults.

This should sit on top of the current health-led Pulse review model. Faults, downtime and failed checks reduce health; servicing, completed maintenance and consistent care can boost health or accelerate recovery.

Future build:

create an equipmentServiceEvents collection or equivalent service log
allow managers to manually record when servicing took place
support service type, date, provider, notes, evidence/photo, invoice/reference and next service due date
link service events to the equipment activity feed
show servicing history on the equipment detail page
allow service events to boost equipment health
make full servicing a large health boost, especially after a repair or long downtime
make completed maintenance tasks a small health increase
make cleaning tasks a very small health increase or confidence signal
make passed inspections and passed safety checks increase health confidence
make failed checks reduce health more than routine cleaning can improve it
cap health boosts so routine cleaning cannot hide serious unresolved faults
avoid health increasing above safe levels while equipment is still out of order
allow health boost values to vary by task category, evidence level and equipment type
support different decay/recovery profiles for different machine types where needed
include servicing in the clean-service recovery model
include upcoming or overdue service dates in Pulse and equipment detail

Examples:

annual treadmill service adds a large health boost and records the service provider
belt replacement after repeated belt faults gives a repair bump and starts clean-service regeneration
weekly maintenance completion adds a small health improvement
daily cleaning adds only a tiny confidence improvement and cannot offset mechanical faults
passed safety inspection improves confidence after an out-of-order event
missed service date slowly reduces health confidence

Manager workflow:

manager opens equipment detail
manager selects Add service record
manager enters service date, provider, work completed and notes
manager optionally uploads evidence or invoice reference
service appears in equipment activity and service history
equipment health updates according to the service type and current state
next service due date can be set or suggested

RBAC requirements:

Managers can create and edit service records for their facility
Staff may view service history if relevant to their work
Staff cannot create formal service records unless explicitly granted later
Public users cannot view service records, invoices, provider notes or internal evidence
Cross-facility service records must be blocked
Service record changes should be auditable

Testing criteria:

Manager can add a service record to equipment
Service record appears in equipment history
Service record creates an activity feed item
Full service boosts health more than routine maintenance
Maintenance task completion gives a small health increase
Cleaning task completion does not hide unresolved serious faults
Health does not jump to full health while equipment remains out of order
Passed safety inspection improves health confidence
Overdue service date reduces health confidence or appears as a Pulse signal
Staff cannot create service records without permission
Public cannot read service records

Clickable Activity and Status Reasoning

Equipment activity and status reasoning should become actionable, not just informational.

Managers should be able to click activity feed items and status reasoning rows to go directly to the relevant task, issue, spot check, out-of-order event, equipment record or rework item. This will make it much faster to investigate and resolve amber/red status causes.

Future build:

activity feed items become links when a target exists
task_completed activity links to the completed task
fault_reported activity links to the issue detail
issue_status_changed activity links to the issue detail
equipment_marked_out_of_order activity links to the out-of-order event or linked issue
equipment_returned_to_service activity links to the out-of-order history
spot_check_completed activity links to the spot check detail
AI insight activity links to the insight detail
status reasoning rows include target references
active issue reasoning links to filtered/open issues or the exact issue
out-of-order reasoning links to the active out-of-order event
failed/recheck spot check reasoning links to the relevant spot check
overdue task reasoning links to the overdue task
replacement warning reasoning links to replacement intelligence when available

UX requirements:

Use clear hover/focus states so clickable rows feel intentional
Show a small arrow or external-link icon on actionable rows
If multiple records cause the same status reason, open a filtered list rather than choosing one silently
If the current user lacks permission for a target, hide the link or route to an allowed summary
Keep public QR pages non-internal and do not expose staff or manager-only targets

RBAC requirements:

Staff can only click through to records they are allowed to view
Managers can click through to facility records
Public users cannot access internal activity or reasoning targets
Cross-facility links must be blocked
Manager-only activity remains manager-only

Testing criteria:

Task activity opens the task detail
Fault activity opens the issue detail
Out-of-order activity opens the linked issue or event detail
Spot-check activity opens the spot check detail
Status reason for active issue opens the issue or filtered issue list
Status reason for overdue task opens the task
Staff cannot open manager-only target links
Public users cannot access internal linked targets

Navigation and Header Overhaul

FacilityOS should eventually have a more complete navigation system so users do not need to manually enter URLs or remember route paths.

As the product grows, navigation should make the app feel connected and easy to move around. Staff, managers, admins and future super users should each see navigation that matches their role and current workflow.

Future build:

persistent app navigation for logged-in users
role-aware navigation items
manager navigation for Pulse, Equipment, Tasks, Issues, Spot Checks, Insights and Settings
staff navigation for Today, Tasks, Equipment and relevant assigned work
admin navigation for organisation, facilities, users and reporting when admin roles are added
mobile bottom navigation for high-frequency staff actions
desktop sidebar or top navigation for manager/admin workflows
breadcrumbs on detail pages
contextual page actions in headers
clear links from equipment detail to public QR page
copy public QR URL action
quick action menu for common equipment actions
facility switcher when multi-facility support is added
user/account menu with role, facility and logout
active route highlighting
back links that return users to the correct previous list/filter where possible
empty states that include direct next-step actions

Header requirements:

Headers should show where the user is, what object they are viewing and the most useful next actions.
Equipment detail headers should include public page, edit, out-of-order/return-to-service and back actions where permitted.
Issue detail headers should include status, priority and return-to-list actions.
Task detail headers should include completion status and return-to-task-list actions.
Spot check headers should include review status and link back to related tasks/equipment.

RBAC requirements:

Navigation items must be role-aware
Staff must not see manager-only routes
Managers must not see platform-only super-user routes
Public QR users must not see internal app navigation
Hidden navigation must not replace route/API/Firestore enforcement
Cross-facility navigation must be blocked unless the user has access

Testing criteria:

Staff can navigate without typing URLs
Manager can navigate between Pulse, Equipment, Tasks, Issues and Spot Checks
Equipment detail links to the public QR page
Breadcrumbs work on detail pages
Mobile navigation is usable on staff workflows
Manager-only navigation is hidden from staff
Public QR page does not expose internal navigation
Back actions return to sensible list views
First Codex Build Instruction

Use this to start the build:

You are building FacilityOS.

FacilityOS is a premium, mobile-first equipment care and facility operations platform for gyms and sports facilities.

The product gives every piece of equipment a QR-linked public status page, a care plan, a fault history, a maintenance history, out-of-order tracking, manager spot checks, replacement intelligence and AI-powered operational insights.

Use Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Firebase Auth, Firestore, Firebase Storage and Vercel.

RBAC is a core requirement from Sprint 1. The app has three access levels:
1. Public users: unauthenticated QR users
2. Staff users: logged-in operational staff
3. Manager users: facility managers/admins

RBAC must be enforced at route level, component level, server/action level, Firestore security rules level and cross-facility data level.

Do not rely on hiding UI alone.

The app should feel like a premium sports-tech/social media app, not an old-fashioned admin dashboard.

Build incrementally by sprint. Do not overbuild beyond the sprint scope.
Best Build Order

Start with the secure product loop:

Auth + RBAC
→ Facility setup
→ Equipment profiles
→ Public QR page
→ Fault reporting
→ Staff tasks
→ Out-of-order mode
→ Manager Pulse

Then add the intelligence layer:

Spot checks
→ Adaptive sampling
→ Status engine
→ Replacement intelligence
→ AI fault analysis
→ AI insights

This keeps the project controlled, secure and buildable while still moving toward the full FacilityOS vision.
