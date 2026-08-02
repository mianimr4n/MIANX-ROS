# Role and separation of duties

- Purchasing / finance / HR gates reuse AdminDashboard `canLoad*` flags
- Permission-restricted domains omitted (not shown as zero)
- Destination pages retain mutation SoD; DASH-04 adds no approve path
- Known gap: attention counts do not prove requester≠approver — documented limitation
