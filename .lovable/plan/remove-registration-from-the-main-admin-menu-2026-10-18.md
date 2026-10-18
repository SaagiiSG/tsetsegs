# Remove "Registration" from the main admin menu

Take the "Registration" link out of the admin dashboard menu, in both places it appears:

- Desktop sidebar, under the "Tools" section
- Phone "More" sheet

What stays the same:
- The "Registration queue" button on Student Management
- The public `/register` booking page for students
- The `/register/admin` page still works if you open it by its address. It just won't be in the menu anymore. (Tell me if you want the page deleted entirely.)

## Technical details
- `src/components/admin/menuSections.ts`: remove the `{ title: "Registration", url: "/register/admin" }` item from Tools.
- `src/components/admin/mobile/MoreSheet.tsx`: remove the matching `/register/admin` item.
