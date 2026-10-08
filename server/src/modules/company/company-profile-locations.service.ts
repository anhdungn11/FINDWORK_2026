import { Injectable } from "@nestjs/common";
import { CompanyProfileLocationsRepository } from "./company-profile-locations.repository";
import type { CreateCompanyLocationDto } from "./dto/create-company-location.dto";
import type { UpdateCompanyLocationDto } from "./dto/update-company-location.dto";
import type { UpdateCompanyProfileDto } from "./dto/update-company-profile.dto";

@Injectable()
export class CompanyProfileLocationsService {
  constructor(private readonly repo: CompanyProfileLocationsRepository) {}

  getProfile(companyId: string) { return this.repo.getProfile(companyId); }
  updateProfile(companyId: string, actorUserId: string, dto: UpdateCompanyProfileDto) {
    return this.repo.updateProfile(companyId, actorUserId, dto);
  }
  listLocations(companyId: string) { return this.repo.listLocations(companyId); }
  getLocation(companyId: string, locationId: string) {
    return this.repo.getLocation(companyId, locationId);
  }
  createLocation(companyId: string, actorUserId: string, dto: CreateCompanyLocationDto) {
    return this.repo.createLocation(companyId, actorUserId, dto);
  }
  updateLocation(companyId: string, locationId: string, actorUserId: string, dto: UpdateCompanyLocationDto) {
    return this.repo.updateLocation(companyId, locationId, actorUserId, dto);
  }
  promoteHeadquarters(companyId: string, locationId: string, actorUserId: string) {
    return this.repo.promoteHeadquarters(companyId, locationId, actorUserId);
  }
  deleteLocation(companyId: string, locationId: string, actorUserId: string) {
    return this.repo.deleteLocation(companyId, locationId, actorUserId);
  }
}
